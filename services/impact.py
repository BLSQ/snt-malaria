from collections import defaultdict
from dataclasses import dataclass, field
from typing import Optional

from iaso.models import OrgUnit
from plugins.snt_malaria.models import Intervention, InterventionAssignment, Scenario
from plugins.snt_malaria.providers.impact.base import (
    ImpactMetricWithConfidenceInterval,
    ImpactProvider,
    ImpactProviderMeta,
    ImpactResult,
    MatchWarnings,
    OrgUnitRef,
)


@dataclass
class ImpactMetrics:
    """Shared impact metrics used at every aggregation level."""

    number_cases: ImpactMetricWithConfidenceInterval = field(default_factory=ImpactMetricWithConfidenceInterval)
    number_severe_cases: ImpactMetricWithConfidenceInterval = field(default_factory=ImpactMetricWithConfidenceInterval)
    prevalence_rate: ImpactMetricWithConfidenceInterval = field(default_factory=ImpactMetricWithConfidenceInterval)
    direct_deaths: ImpactMetricWithConfidenceInterval = field(default_factory=ImpactMetricWithConfidenceInterval)


@dataclass
class OrgUnitImpactMetrics(ImpactMetrics):
    """Impact metrics for a single org unit, used both per-year and across years."""

    org_unit_id: int = 0
    org_unit_name: str = ""

    @classmethod
    def from_impact_result(
        cls,
        result: ImpactResult,
        org_unit: OrgUnit,
    ) -> "OrgUnitImpactMetrics":
        return cls(
            org_unit_id=org_unit.id,
            org_unit_name=org_unit.name,
            number_cases=result.number_cases,
            number_severe_cases=result.number_severe_cases,
            prevalence_rate=result.prevalence_rate,
            direct_deaths=result.direct_deaths,
        )


@dataclass
class YearImpactMetrics(ImpactMetrics):
    """Aggregated impact metrics for a single year across all org units."""

    year: int = 0
    org_units: list[OrgUnitImpactMetrics] = field(default_factory=list)


@dataclass
class ScenarioImpactMetrics(ImpactMetrics):
    """Top-level impact result for a scenario, with breakdowns by year and org unit."""

    scenario_id: int = 0
    by_year: list[YearImpactMetrics] = field(default_factory=list)
    org_units: list[OrgUnitImpactMetrics] = field(default_factory=list)
    org_units_not_found: list[OrgUnitRef] = field(default_factory=list)
    org_units_with_unmatched_interventions: list[OrgUnitRef] = field(default_factory=list)
    provider_meta: ImpactProviderMeta = field(default_factory=lambda: ImpactProviderMeta(provider_key=""))


def _aggregate_metrics(metrics: list[ImpactMetrics]) -> ImpactMetrics:
    """Aggregate a list of ImpactMetrics.

    Sums cases, severe cases, and direct deaths. Averages prevalence.
    """
    sum_cases = ImpactMetricWithConfidenceInterval()
    sum_severe = ImpactMetricWithConfidenceInterval()
    sum_deaths = ImpactMetricWithConfidenceInterval()
    sum_prevalence = ImpactMetricWithConfidenceInterval()
    prevalence_count = 0

    for m in metrics:
        sum_cases = sum_cases + m.number_cases
        sum_severe = sum_severe + m.number_severe_cases
        sum_deaths = sum_deaths + m.direct_deaths
        if m.prevalence_rate.value is not None:
            sum_prevalence = sum_prevalence + m.prevalence_rate
            prevalence_count += 1

    avg_prevalence = sum_prevalence / prevalence_count if prevalence_count else ImpactMetricWithConfidenceInterval()

    return ImpactMetrics(
        number_cases=sum_cases,
        number_severe_cases=sum_severe,
        prevalence_rate=avg_prevalence,
        direct_deaths=sum_deaths,
    )


class ImpactService:
    """Orchestrates impact analysis for a scenario.

    Fetches epidemiological data from an ImpactProvider (cases, prevalence,
    deaths) and aggregates results per org unit, per year, and overall.
    """

    def __init__(self, provider: ImpactProvider):
        self._provider = provider

    def get_scenario_impact(
        self,
        scenario: Scenario,
        age_group: str,
        year_from: Optional[str] = None,
        year_to: Optional[str] = None,
    ) -> ScenarioImpactMetrics:
        """Return the full impact result for a scenario."""
        org_unit_interventions = self._get_org_unit_interventions(scenario)
        year_data, warnings = self._collect_metrics(org_unit_interventions, age_group, year_from, year_to)
        return self._build_response(scenario, year_data, warnings)

    @staticmethod
    def _get_org_unit_interventions(scenario: Scenario) -> dict[OrgUnit, list[Intervention]]:
        default_version = scenario.account.default_version
        assignments = (
            InterventionAssignment.objects.select_related("org_unit", "org_unit__impact_mapping", "intervention")
            .filter(scenario=scenario, org_unit__version=default_version)
            .order_by("org_unit__id")
        )
        result: dict[OrgUnit, list[Intervention]] = defaultdict(list)
        for assignment in assignments:
            result[assignment.org_unit].append(assignment.intervention)
        return dict(result)

    def _collect_metrics(
        self,
        org_unit_interventions: dict[OrgUnit, list[Intervention]],
        age_group: str,
        year_from: Optional[str],
        year_to: Optional[str],
    ) -> tuple[dict[int, list[OrgUnitImpactMetrics]], MatchWarnings]:
        ou_by_id: dict[int, OrgUnit] = {ou.id: ou for ou in org_unit_interventions}
        year_data: dict[int, list[OrgUnitImpactMetrics]] = defaultdict(list)
        warnings = MatchWarnings()

        if self._provider.supports_bulk:
            self._collect_bulk(org_unit_interventions, age_group, year_from, year_to, ou_by_id, year_data, warnings)
        else:
            self._collect_individual(org_unit_interventions, age_group, year_from, year_to, year_data, warnings)

        return dict(year_data), warnings

    def _collect_bulk(
        self,
        org_unit_interventions: dict[OrgUnit, list[Intervention]],
        age_group: str,
        year_from: Optional[str],
        year_to: Optional[str],
        ou_by_id: dict[int, OrgUnit],
        year_data: dict[int, list[OrgUnitImpactMetrics]],
        warnings: MatchWarnings,
    ) -> None:
        """Fetch impact data using batch queries, grouped by intervention mix."""
        groups: dict[frozenset[int], tuple[list[OrgUnit], list[Intervention]]] = {}
        for org_unit, interventions in org_unit_interventions.items():
            key = frozenset(i.id for i in interventions)
            if key not in groups:
                groups[key] = ([], interventions)
            groups[key][0].append(org_unit)

        for org_units, interventions in groups.values():
            bulk = self._provider.match_impact_bulk(
                org_units=org_units,
                interventions=interventions,
                age_group=age_group,
                year_from=year_from,
                year_to=year_to,
            )

            warnings.org_units_not_found.extend(bulk.warnings.org_units_not_found)
            warnings.org_units_with_unmatched_interventions.extend(bulk.warnings.org_units_with_unmatched_interventions)

            for ou_id, impact_results in bulk.results.items():
                org_unit = ou_by_id[ou_id]
                for result in impact_results:
                    metrics = OrgUnitImpactMetrics.from_impact_result(result, org_unit)
                    year_data[result.year].append(metrics)

    def _collect_individual(
        self,
        org_unit_interventions: dict[OrgUnit, list[Intervention]],
        age_group: str,
        year_from: Optional[str],
        year_to: Optional[str],
        year_data: dict[int, list[OrgUnitImpactMetrics]],
        warnings: MatchWarnings,
    ) -> None:
        """Fetch impact data one org unit at a time via match_impact."""
        for org_unit, interventions in org_unit_interventions.items():
            match = self._provider.match_impact(
                org_unit=org_unit,
                interventions=interventions,
                age_group=age_group,
                year_from=year_from,
                year_to=year_to,
            )

            warnings.org_units_not_found.extend(match.warnings.org_units_not_found)
            warnings.org_units_with_unmatched_interventions.extend(
                match.warnings.org_units_with_unmatched_interventions
            )

            for result in match.results:
                metrics = OrgUnitImpactMetrics.from_impact_result(result, org_unit)
                year_data[result.year].append(metrics)

    def _aggregate_org_units(
        self,
        year_data: dict[int, list[OrgUnitImpactMetrics]],
    ) -> list[OrgUnitImpactMetrics]:
        per_org_unit: dict[int, list[OrgUnitImpactMetrics]] = defaultdict(list)
        for year_metrics in year_data.values():
            for m in year_metrics:
                per_org_unit[m.org_unit_id].append(m)

        results = []
        for ou_id, ou_metrics in per_org_unit.items():
            totals = _aggregate_metrics(ou_metrics)
            results.append(
                OrgUnitImpactMetrics(
                    org_unit_id=ou_id,
                    org_unit_name=ou_metrics[0].org_unit_name,
                    **{f.name: getattr(totals, f.name) for f in ImpactMetrics.__dataclass_fields__.values()},
                )
            )
        return results

    @staticmethod
    def _deduplicate_org_units(org_units: list[OrgUnitRef]) -> list[OrgUnitRef]:
        """Deduplicate by id and sort by name."""
        seen: dict[int, OrgUnitRef] = {}
        for ou in org_units:
            if ou.id not in seen:
                seen[ou.id] = ou
        return sorted(seen.values(), key=lambda ou: ou.name)

    def _build_response(
        self,
        scenario: Scenario,
        year_data: dict[int, list[OrgUnitImpactMetrics]],
        warnings: MatchWarnings,
    ) -> ScenarioImpactMetrics:
        by_year = []
        all_metrics: list[OrgUnitImpactMetrics] = []

        for year in sorted(year_data.keys()):
            metrics = year_data[year]
            if not metrics:
                continue

            totals = _aggregate_metrics(metrics)
            by_year.append(
                YearImpactMetrics(
                    year=year,
                    org_units=metrics,
                    **{f.name: getattr(totals, f.name) for f in ImpactMetrics.__dataclass_fields__.values()},
                )
            )
            all_metrics.extend(metrics)

        overall = _aggregate_metrics(all_metrics) if all_metrics else ImpactMetrics()
        return ScenarioImpactMetrics(
            scenario_id=scenario.id,
            by_year=by_year,
            org_units=self._aggregate_org_units(year_data),
            org_units_not_found=self._deduplicate_org_units(warnings.org_units_not_found),
            org_units_with_unmatched_interventions=self._deduplicate_org_units(
                warnings.org_units_with_unmatched_interventions
            ),
            provider_meta=self._provider.get_meta(),
            **{f.name: getattr(overall, f.name) for f in ImpactMetrics.__dataclass_fields__.values()},
        )
