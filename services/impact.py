from collections import defaultdict
from dataclasses import dataclass, field
from typing import Optional

from iaso.models import OrgUnit
from plugins.snt_malaria.models import Budget, Intervention, InterventionAssignment, Scenario
from plugins.snt_malaria.providers.impact.base import ImpactProvider, ImpactResult
from plugins.snt_malaria.types import MetricWithCI


@dataclass
class ImpactMetrics:
    """Shared impact metrics used at every aggregation level."""

    number_cases: MetricWithCI = field(default_factory=MetricWithCI)
    number_severe_cases: MetricWithCI = field(default_factory=MetricWithCI)
    prevalence_rate: MetricWithCI = field(default_factory=MetricWithCI)
    averted_cases: MetricWithCI = field(default_factory=MetricWithCI)
    direct_deaths: MetricWithCI = field(default_factory=MetricWithCI)
    cost: Optional[float] = None
    cost_per_averted_case: MetricWithCI = field(default_factory=MetricWithCI)


@dataclass
class OrgUnitMetrics(ImpactMetrics):
    """Impact metrics for a single org unit, used both per-year and across years."""

    org_unit_id: int = 0
    org_unit_name: str = ""

    @classmethod
    def from_impact_result(
        cls,
        result: ImpactResult,
        org_unit: OrgUnit,
        cost: Optional[float] = None,
    ) -> "OrgUnitMetrics":
        averted_cases = _compute_averted_cases(
            result.population, result.number_cases, result.number_severe_cases
        )
        return cls(
            org_unit_id=org_unit.id,
            org_unit_name=org_unit.name,
            number_cases=result.number_cases,
            number_severe_cases=result.number_severe_cases,
            prevalence_rate=result.prevalence_rate,
            averted_cases=averted_cases,
            direct_deaths=result.direct_deaths,
            cost=cost,
            cost_per_averted_case=_compute_cost_per_averted(cost, averted_cases),
        )


@dataclass
class YearMetrics(ImpactMetrics):
    """Aggregated impact metrics for a single year across all org units."""

    year: int = 0
    org_units: list[OrgUnitMetrics] = field(default_factory=list)


@dataclass
class ScenarioImpact(ImpactMetrics):
    """Top-level impact result for a scenario, with breakdowns by year and org unit."""

    scenario_id: int = 0
    by_year: list[YearMetrics] = field(default_factory=list)
    org_units: list[OrgUnitMetrics] = field(default_factory=list)


def _compute_averted_cases(
    population: float,
    number_cases: MetricWithCI,
    number_severe_cases: MetricWithCI,
) -> MetricWithCI:
    """Compute averted cases = population - (cases + severe).

    CI bounds invert: lower averted when cases are at their upper bound.
    """

    def _subtract(pop, cases_val, severe_val):
        if cases_val is not None and severe_val is not None:
            return pop - (cases_val + severe_val)
        return None

    return MetricWithCI(
        value=_subtract(population, number_cases.value, number_severe_cases.value),
        # CI bounds invert: fewer cases (lower bound) → more averted (upper bound)
        lower=_subtract(population, number_cases.upper, number_severe_cases.upper),
        upper=_subtract(population, number_cases.lower, number_severe_cases.lower),
    )


def _compute_cost_per_averted(
    cost: Optional[float],
    averted_cases: MetricWithCI,
) -> MetricWithCI:
    """Compute cost per averted case = cost / averted.

    CI bounds invert: lower cost/averted when most averted (upper).
    """
    if cost is None:
        return MetricWithCI()

    def _divide(c, averted):
        if averted is not None and averted > 0:
            return c / averted
        return None

    return MetricWithCI(
        value=_divide(cost, averted_cases.value),
        # CI bounds invert: more averted (upper) → lower cost per averted
        lower=_divide(cost, averted_cases.upper),
        upper=_divide(cost, averted_cases.lower),
    )


def _aggregate_metrics(metrics: list[ImpactMetrics]) -> ImpactMetrics:
    """Aggregate a list of ImpactMetrics.

    Sums cases, severe cases, averted cases, direct deaths, and cost.
    Averages prevalence. Derives cost_per_averted_case from summed cost
    and summed averted cases (only counting entries that have cost data).
    """
    sum_cases = MetricWithCI()
    sum_severe = MetricWithCI()
    sum_averted = MetricWithCI()
    sum_deaths = MetricWithCI()
    sum_cost = 0.0
    has_cost = False
    sum_costed_averted = MetricWithCI()
    sum_prevalence = MetricWithCI()
    prevalence_count = 0

    for m in metrics:
        sum_cases = sum_cases + m.number_cases
        sum_severe = sum_severe + m.number_severe_cases
        sum_averted = sum_averted + m.averted_cases
        sum_deaths = sum_deaths + m.direct_deaths
        if m.cost is not None:
            sum_cost += m.cost
            has_cost = True
            sum_costed_averted = sum_costed_averted + m.averted_cases
        if m.prevalence_rate.value is not None:
            sum_prevalence = sum_prevalence + m.prevalence_rate
            prevalence_count += 1

    avg_prevalence = sum_prevalence / prevalence_count if prevalence_count else MetricWithCI()

    return ImpactMetrics(
        number_cases=sum_cases,
        number_severe_cases=sum_severe,
        prevalence_rate=avg_prevalence,
        averted_cases=sum_averted,
        direct_deaths=sum_deaths,
        cost=sum_cost if has_cost else None,
        cost_per_averted_case=_compute_cost_per_averted(
            sum_cost if has_cost else None, sum_costed_averted
        ),
    )


class ImpactService:
    """Orchestrates impact analysis for a scenario.

    Combines epidemiological data from an ImpactProvider (cases, prevalence,
    deaths) with budget cost data for the given scenario to produce enriched
    metrics such as averted cases and cost per averted case. Results are
    aggregated per org unit, per year, and overall.
    """

    def __init__(self, provider: ImpactProvider):
        self._provider = provider

    def get_scenario_impact(
        self,
        scenario: Scenario,
        age_group: str,
        year_from: Optional[str] = None,
        year_to: Optional[str] = None,
    ) -> ScenarioImpact:
        """Return the full impact result for a scenario."""
        org_unit_interventions = self._get_org_unit_interventions(scenario)
        cost_map = self._build_cost_map(scenario)
        year_data = self._collect_metrics(
            org_unit_interventions, cost_map, age_group, year_from, year_to
        )
        return self._build_response(scenario, year_data)

    @staticmethod
    def _get_org_unit_interventions(scenario: Scenario) -> dict[OrgUnit, list[Intervention]]:
        assignments = (
            InterventionAssignment.objects.select_related("org_unit", "intervention")
            .filter(scenario=scenario)
            .order_by("org_unit__id")
        )
        result: dict[OrgUnit, list[Intervention]] = defaultdict(list)
        for assignment in assignments:
            result[assignment.org_unit].append(assignment.intervention)
        return dict(result)

    @staticmethod
    def _build_cost_map(scenario: Scenario) -> dict[int, dict[int, float]]:
        latest_budget = Budget.objects.filter(scenario=scenario).order_by("-created_at").first()
        if not latest_budget or not latest_budget.results:
            return {}

        cost_map: dict[int, dict[int, float]] = {}
        for year_result in latest_budget.results:
            budget_year = year_result.get("year")
            if budget_year is None:
                continue
            for org_unit_cost in year_result.get("org_units_costs", []):
                ou_id = org_unit_cost.get("org_unit_id")
                cost = org_unit_cost.get("total_cost", 0)
                if ou_id is not None:
                    cost_map.setdefault(budget_year, {})[ou_id] = cost

        return cost_map

    def _collect_metrics(
        self,
        org_unit_interventions: dict[OrgUnit, list[Intervention]],
        cost_map: dict[int, dict[int, float]],
        age_group: str,
        year_from: Optional[str],
        year_to: Optional[str],
    ) -> dict[int, list[OrgUnitMetrics]]:
        ou_by_id: dict[int, OrgUnit] = {ou.id: ou for ou in org_unit_interventions}
        year_data: dict[int, list[OrgUnitMetrics]] = defaultdict(list)

        if self._provider.supports_bulk:
            self._collect_bulk(org_unit_interventions, age_group, year_from, year_to, ou_by_id, cost_map, year_data)
        else:
            self._collect_individual(org_unit_interventions, age_group, year_from, year_to, cost_map, year_data)

        return dict(year_data)

    def _collect_bulk(
        self,
        org_unit_interventions: dict[OrgUnit, list[Intervention]],
        age_group: str,
        year_from: Optional[str],
        year_to: Optional[str],
        ou_by_id: dict[int, OrgUnit],
        cost_map: dict[int, dict[int, float]],
        year_data: dict[int, list[OrgUnitMetrics]],
    ) -> None:
        """Fetch impact data using batch queries, grouped by intervention mix."""
        groups: dict[frozenset[int], tuple[list[OrgUnit], list[Intervention]]] = {}
        for org_unit, interventions in org_unit_interventions.items():
            key = frozenset(i.id for i in interventions)
            if key not in groups:
                groups[key] = ([], interventions)
            groups[key][0].append(org_unit)

        for org_units, interventions in groups.values():
            bulk_results = self._provider.match_impact_bulk(
                org_units=org_units,
                interventions=interventions,
                age_group=age_group,
                year_from=year_from,
                year_to=year_to,
            )

            for ou_id, impact_results in bulk_results.items():
                org_unit = ou_by_id[ou_id]
                for result in impact_results:
                    ou_cost = cost_map.get(result.year, {}).get(ou_id)
                    metrics = OrgUnitMetrics.from_impact_result(result, org_unit, cost=ou_cost)
                    year_data[result.year].append(metrics)

    def _collect_individual(
        self,
        org_unit_interventions: dict[OrgUnit, list[Intervention]],
        age_group: str,
        year_from: Optional[str],
        year_to: Optional[str],
        cost_map: dict[int, dict[int, float]],
        year_data: dict[int, list[OrgUnitMetrics]],
    ) -> None:
        """Fetch impact data one org unit at a time via match_impact."""
        for org_unit, interventions in org_unit_interventions.items():
            impact_results = self._provider.match_impact(
                org_unit=org_unit,
                interventions=interventions,
                age_group=age_group,
                year_from=year_from,
                year_to=year_to,
            )

            for result in impact_results:
                ou_cost = cost_map.get(result.year, {}).get(org_unit.id)
                metrics = OrgUnitMetrics.from_impact_result(result, org_unit, cost=ou_cost)
                year_data[result.year].append(metrics)

    def _aggregate_org_units(
        self,
        year_data: dict[int, list[OrgUnitMetrics]],
    ) -> list[OrgUnitMetrics]:
        per_org_unit: dict[int, list[OrgUnitMetrics]] = defaultdict(list)
        for year_metrics in year_data.values():
            for m in year_metrics:
                per_org_unit[m.org_unit_id].append(m)

        results = []
        for ou_id, ou_metrics in per_org_unit.items():
            totals = _aggregate_metrics(ou_metrics)
            results.append(OrgUnitMetrics(
                org_unit_id=ou_id,
                org_unit_name=ou_metrics[0].org_unit_name,
                **{f.name: getattr(totals, f.name) for f in ImpactMetrics.__dataclass_fields__.values()},
            ))
        return results

    def _build_response(
        self,
        scenario: Scenario,
        year_data: dict[int, list[OrgUnitMetrics]],
    ) -> ScenarioImpact:
        by_year = []
        all_metrics: list[OrgUnitMetrics] = []

        for year in sorted(year_data.keys()):
            metrics = year_data[year]
            if not metrics:
                continue

            totals = _aggregate_metrics(metrics)
            by_year.append(YearMetrics(
                year=year,
                org_units=metrics,
                **{f.name: getattr(totals, f.name) for f in ImpactMetrics.__dataclass_fields__.values()},
            ))
            all_metrics.extend(metrics)

        overall = _aggregate_metrics(all_metrics) if all_metrics else ImpactMetrics()
        return ScenarioImpact(
            scenario_id=scenario.id,
            by_year=by_year,
            org_units=self._aggregate_org_units(year_data),
            **{f.name: getattr(overall, f.name) for f in ImpactMetrics.__dataclass_fields__.values()},
        )
