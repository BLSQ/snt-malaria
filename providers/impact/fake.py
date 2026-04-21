"""Fake impact provider for demo purposes.

Generates epidemiologically plausible malaria impact metrics on the fly,
without requiring any external data source. Uses population data from the
data-layers system (a configurable MetricType on the account) as the only
real input, and five generic intervention reference codes (``impact_1``
through ``impact_5``) that each account's real interventions are mapped
to via ``Intervention.impact_ref``.

The five reference codes represent intervention "strength tiers":
``impact_1`` is the weakest (modest reduction, cases slowly grow over
time) and ``impact_5`` is the strongest (large initial reduction plus
sustained decline). Real effect sizes are loosely grounded in 2024-2026
literature (ITN ~13%, ITN+IRS combined ~50%, etc.) but are primarily
chosen to produce visually meaningful differences between scenarios in
the Compare & Customize UI.
"""

from __future__ import annotations

import logging
import math

from dataclasses import dataclass
from datetime import date
from random import Random
from typing import Final

from iaso.models import MetricType, MetricValue, OrgUnit
from plugins.snt_malaria.models import ImpactProviderConfig, Intervention
from plugins.snt_malaria.providers.impact.base import (
    BulkMatchResult,
    ImpactMetricWithConfidenceInterval,
    ImpactProvider,
    ImpactProviderMeta,
    ImpactResult,
    IncompleteConfigError,
    InterventionMappingError,
    MatchResult,
    MatchWarnings,
    OrgUnitRef,
)


logger = logging.getLogger(__name__)


YEAR_SPAN: Final[int] = 10

AGE_GROUP_ALL: Final[str] = "0-100"
AGE_GROUP_UNDER5: Final[str] = "0-5"
AGE_GROUPS: Final[list[str]] = [AGE_GROUP_UNDER5, AGE_GROUP_ALL]

BASELINE_INCIDENCE_PER_1000: Final[float] = 350.0
BASELINE_PREVALENCE: Final[float] = 0.32
SEVERITY_RATE: Final[float] = 0.025
CASE_FATALITY_RATE: Final[float] = 0.04

INTERVENTION_EFFECT: Final[dict[str, float]] = {
    "impact_1": 0.05,
    "impact_2": 0.12,
    "impact_3": 0.20,
    "impact_4": 0.28,
    "impact_5": 0.38,
}

ANNUAL_DRIFT: Final[dict[str, float]] = {
    "impact_1": +0.020,
    "impact_2": -0.015,
    "impact_3": -0.040,
    "impact_4": -0.070,
    "impact_5": -0.100,
}

PREVALENCE_SENSITIVITY: Final[float] = 0.80

# Confidence-interval halfwidth grows linearly with the forecast horizon
# so that bands widen as we project further into the future (matching the
# way real forecasting uncertainty compounds year over year).
CONFIDENCE_INTERVAL_HALFWIDTH_AT_YEAR_ZERO: Final[float] = 0.06
CONFIDENCE_INTERVAL_HALFWIDTH_GROWTH_PER_YEAR: Final[float] = 0.015

# Absolute case volume per age group. Under-5 is a subset of total
# population (~17%) with ~2x higher incidence, so ~30% of total cases.
AGE_GROUP_CASE_MULTIPLIER: Final[dict[str, float]] = {
    AGE_GROUP_UNDER5: 0.30,
    AGE_GROUP_ALL: 1.0,
}

# Per-capita prevalence rate. Under-5 rate is higher than the overall
# rate because children suffer more frequent malaria episodes per person.
AGE_GROUP_PREVALENCE_MULTIPLIER: Final[dict[str, float]] = {
    AGE_GROUP_UNDER5: 1.25,
    AGE_GROUP_ALL: 1.0,
}

# Amplifies drift for an age group so under-5 trajectories bend more
# sharply over the window (steeper declines for strong interventions,
# steeper growth for weak ones), matching the shape typically seen in
# real data where children respond more strongly to both good and bad
# epidemiological trends.
AGE_GROUP_DRIFT_AMPLIFIER: Final[dict[str, float]] = {
    AGE_GROUP_UNDER5: 1.5,
    AGE_GROUP_ALL: 1.0,
}

# Multiplicative factor applied identically to every org unit for a given
# year. Because it's shared across org units it survives aggregation
# (unlike per-org-unit jitter, which averages out) and gives the
# country-level line chart a natural, non-monotonic curve on top of the
# drift trend.
SHARED_SEASONAL_AMPLITUDE: Final[float] = 0.10

KNOWN_IMPACT_REFS: Final[frozenset[str]] = frozenset(INTERVENTION_EFFECT.keys())


@dataclass
class _MetricInputs:
    """Inputs required to compute one ImpactResult row."""

    org_unit: OrgUnit
    year: int
    population: float
    age_group: str
    impact_refs: list[str]
    current_year: int


class FakeImpactProvider(ImpactProvider):
    """Demo impact provider that synthesises metrics from population data.

    The only required config key is ``population_metric_code``: the code of
    a :class:`iaso.models.MetricType` on the account whose values represent
    total population per org unit. The provider returns one ImpactResult
    per year in a rolling window of ``YEAR_SPAN + 1`` years starting at
    the current calendar year.

    Intervention mapping uses the ``Intervention.impact_ref`` field. Valid
    values are ``impact_1`` through ``impact_5`` (see :data:`KNOWN_IMPACT_REFS`).
    """

    meta = ImpactProviderMeta(provider_key=ImpactProviderConfig.ProviderKey.FAKE)

    def __init__(self, config_id: int, config: dict, secret: str | None):
        super().__init__(config_id, config, secret or "")
        population_metric_code = (config or {}).get("population_metric_code")
        if not population_metric_code:
            raise IncompleteConfigError("population_metric_code is required")
        self._population_metric_code: str = population_metric_code
        self._account_id = self._resolve_account_id(config_id)

    @staticmethod
    def _resolve_account_id(config_id: int) -> int:
        return ImpactProviderConfig.objects.values_list("account_id", flat=True).get(id=config_id)

    @property
    def supports_bulk(self) -> bool:
        return True

    def match_impact(
        self,
        org_unit: OrgUnit,
        interventions: list[Intervention],
        age_group: str,
        year_from: int | None = None,
        year_to: int | None = None,
    ) -> MatchResult:
        bulk = self.match_impact_bulk([org_unit], interventions, age_group, year_from, year_to)
        return MatchResult(
            results=bulk.results.get(org_unit.id, []),
            warnings=bulk.warnings,
        )

    def match_impact_bulk(
        self,
        org_units: list[OrgUnit],
        interventions: list[Intervention],
        age_group: str,
        year_from: int | None = None,
        year_to: int | None = None,
    ) -> BulkMatchResult:
        if not org_units:
            return BulkMatchResult()

        impact_refs = [self._map_intervention(intervention) for intervention in interventions]
        populations_by_org_unit = self._load_populations(org_units)

        min_year, max_year = self.get_year_range()
        first_year = max(min_year, int(year_from)) if year_from else min_year
        last_year = min(max_year, int(year_to)) if year_to else max_year
        years = list(range(first_year, last_year + 1))

        results: dict[int, list[ImpactResult]] = {}
        warnings = MatchWarnings()
        for org_unit in org_units:
            population = populations_by_org_unit.get(org_unit.id)
            if population is None:
                warnings.org_units_not_found.append(OrgUnitRef(id=org_unit.id, name=org_unit.name))
                continue
            results[org_unit.id] = [
                self._compute(
                    _MetricInputs(
                        org_unit=org_unit,
                        year=year,
                        population=population,
                        age_group=age_group,
                        impact_refs=impact_refs,
                        current_year=min_year,
                    )
                )
                for year in years
            ]
        return BulkMatchResult(results=results, warnings=warnings)

    def get_year_range(self) -> tuple[int, int]:
        current = date.today().year - 2
        return current, current + YEAR_SPAN

    def get_age_groups(self) -> list[str]:
        return list(AGE_GROUPS)

    @staticmethod
    def _map_intervention(intervention: Intervention) -> str:
        impact_ref = (intervention.impact_ref or "").strip()
        if not impact_ref:
            raise InterventionMappingError(f"Intervention '{intervention}' has no impact_ref")
        if impact_ref not in KNOWN_IMPACT_REFS:
            raise InterventionMappingError(
                f"Unknown impact_ref {impact_ref!r} for intervention '{intervention}'. "
                f"Known refs: {sorted(KNOWN_IMPACT_REFS)}"
            )
        return impact_ref

    def _load_populations(self, org_units: list[OrgUnit]) -> dict[int, float]:
        """Return {org_unit_id: population} using the latest MetricValue per org unit.

        Data layers sometimes store a single time-invariant snapshot with
        ``year=None``; those are treated as valid values (the earliest
        possible year) and used if no explicitly-dated row is available.

        Missing org units are simply absent from the result; callers use
        that to emit ``org_units_not_found`` warnings.
        """
        metric_type = MetricType.objects.filter(account_id=self._account_id, code=self._population_metric_code).first()
        if metric_type is None:
            logger.warning(
                "FakeImpactProvider: MetricType with code %r not found for account %s",
                self._population_metric_code,
                self._account_id,
            )
            return {}

        org_unit_ids = [org_unit.id for org_unit in org_units]
        rows = MetricValue.objects.filter(
            metric_type=metric_type,
            org_unit_id__in=org_unit_ids,
            value__isnull=False,
        ).values("org_unit_id", "year", "value")

        best_by_org_unit: dict[int, tuple[float, float]] = {}
        for row in rows:
            org_unit_id = row["org_unit_id"]
            year_key = float(row["year"]) if row["year"] is not None else float("-inf")
            population = float(row["value"])
            best_entry = best_by_org_unit.get(org_unit_id)
            if best_entry is None or year_key > best_entry[0]:
                best_by_org_unit[org_unit_id] = (year_key, population)
        return {org_unit_id: population for org_unit_id, (_, population) in best_by_org_unit.items()}

    def _compute(self, inputs: _MetricInputs) -> ImpactResult:
        years_elapsed = max(0, inputs.year - inputs.current_year)

        survival = 1.0
        for impact_ref in inputs.impact_refs:
            survival *= 1 - INTERVENTION_EFFECT[impact_ref]
        initial_reduction = 1 - survival

        drift_amplifier = AGE_GROUP_DRIFT_AMPLIFIER.get(inputs.age_group, 1.0)
        if inputs.impact_refs:
            average_drift = sum(ANNUAL_DRIFT[impact_ref] for impact_ref in inputs.impact_refs) / len(inputs.impact_refs)
        else:
            average_drift = 0.0
        yearly_drift_factor = (1 + average_drift * drift_amplifier) ** years_elapsed

        random_generator = Random(hash((inputs.org_unit.id, inputs.year)))
        per_org_unit_jitter = 1 + random_generator.uniform(-0.05, 0.05)

        seasonal_factor = _shared_seasonal_factor(years_elapsed)

        case_multiplier = AGE_GROUP_CASE_MULTIPLIER.get(inputs.age_group, 1.0)
        prevalence_multiplier = AGE_GROUP_PREVALENCE_MULTIPLIER.get(inputs.age_group, 1.0)
        population = inputs.population

        intervention_envelope = (1 - initial_reduction) * yearly_drift_factor * seasonal_factor * per_org_unit_jitter
        cases = (BASELINE_INCIDENCE_PER_1000 / 1000) * population * case_multiplier * intervention_envelope
        severe_cases = cases * SEVERITY_RATE
        direct_deaths = severe_cases * CASE_FATALITY_RATE
        prevalence_rate = (
            BASELINE_PREVALENCE
            * prevalence_multiplier
            * (1 - initial_reduction * PREVALENCE_SENSITIVITY)
            * yearly_drift_factor
            * seasonal_factor
            * per_org_unit_jitter
        )

        halfwidth = _confidence_interval_halfwidth(years_elapsed)
        return ImpactResult(
            year=inputs.year,
            population=population,
            number_cases=_with_confidence_interval(cases, halfwidth),
            number_severe_cases=_with_confidence_interval(severe_cases, halfwidth),
            prevalence_rate=_with_confidence_interval(prevalence_rate, halfwidth),
            direct_deaths=_with_confidence_interval(direct_deaths, halfwidth),
        )


def _shared_seasonal_factor(year_offset: int) -> float:
    """Deterministic multiplicative factor depending only on the year offset.

    Because it's shared across every org unit, it survives aggregation and
    makes the country-level yearly trajectory look like a smooth curve rather
    than a straight line. Anchored to 1.0 at year 0 and at ``YEAR_SPAN`` so
    the baseline year and the final year are driven purely by the drift
    trend (keeping the reduction-vs-year contract intact).
    """
    if year_offset <= 0 or YEAR_SPAN <= 0:
        return 1.0
    return 1.0 + SHARED_SEASONAL_AMPLITUDE * math.sin(2 * math.pi * year_offset / YEAR_SPAN)


def _confidence_interval_halfwidth(years_elapsed: int) -> float:
    return CONFIDENCE_INTERVAL_HALFWIDTH_AT_YEAR_ZERO + CONFIDENCE_INTERVAL_HALFWIDTH_GROWTH_PER_YEAR * max(
        0, years_elapsed
    )


def _with_confidence_interval(value: float, halfwidth: float) -> ImpactMetricWithConfidenceInterval:
    return ImpactMetricWithConfidenceInterval(
        value=value,
        lower=value * (1 - halfwidth),
        upper=value * (1 + halfwidth),
    )
