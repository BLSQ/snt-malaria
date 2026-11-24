from __future__ import annotations

import logging
import warnings

from dataclasses import replace
from functools import cache
from importlib import metadata
from typing import Any, Callable

from django.utils.translation import gettext_lazy as _

from iaso.models import OrgUnit
from plugins.snt_malaria.models import ImpactProviderConfig, Intervention
from plugins.snt_malaria.providers.impact.base import (
    BulkMatchResult,
    ImpactMetricWithConfidenceInterval,
    ImpactProvider,
    ImpactProviderMeta,
    ImpactRefOption,
    ImpactResult,
    IncompleteConfigError,
    InterventionMappingError,
    MatchResult,
    MatchWarnings,
    OrgUnitRef,
)


logger = logging.getLogger(__name__)

EMULATOR_DISTRIBUTION = "cmr-emulator"
DEFAULT_BUNDLE = "v7_av"
DEFAULT_COVERAGE = 0.8
REQUIRED_OUTPUTS = {"incidence", "uncomplicated", "severe", "prevalence"}
BASELINE_IMPACT_REF = "CM"
RESULT_COLUMNS = ["district", "year", "EIR_CI", "incidence", "uncomplicated", "severe", "prevalence", "population"]


@cache
def _load_emulator(bundle: str) -> tuple[Any, Callable[[str], str]]:
    """Return the emulator for a bundle and the package's district-name normaliser."""
    import cmr_emulator

    return cmr_emulator.load(bundle), cmr_emulator.norm_name


class SwissTPHEmulatorImpactProvider(ImpactProvider):
    """Impact data provider backed by the SwissTPH OpenMalaria emulator.

    Predictions are computed in-process by the ``cmr_emulator`` package.
    Org units are matched by district name (ImpactOrgUnitMapping reference,
    else org_unit.name) and interventions by the emulator's intervention
    names (``IG2``, ``SMC``, ...) in ``Intervention.impact_ref``. ``CM`` is
    accepted as a no-op, since the emulator's baseline is case management.

    The following keys in the config JSON control provider behaviour:

    - ``bundle`` – emulator bundle to load (default ``"v7_av"``); it must
      provide clinical, uncomplicated and severe incidence, prevalence and
      population.
    - ``eir_ci_mean``, ``eir_ci_lower``, ``eir_ci_upper`` – EIR levels used
      as the mean, lower and upper confidence-interval bands (defaults
      ``"EIR_mean"``, ``"EIR_lci"``, ``"EIR_uci"``).
    - ``coverage`` – coverage (0-1) per emulator intervention when deployed,
      e.g. ``{"SMC": 0.9}``; unlisted interventions default to 0.8.
    """

    meta = ImpactProviderMeta(
        provider_key=ImpactProviderConfig.ProviderKey.SWISSTPH_EMULATOR,
        metric_annotations={
            "number_cases": _("All malaria cases (uncomplicated + severe)"),
            "number_uncomplicated_cases": _("All uncomplicated malaria cases"),
        },
    )

    def __init__(self, config_id: int, config: dict, secret: str):
        super().__init__(config_id, config, secret)
        bundle = config.get("bundle", DEFAULT_BUNDLE)
        try:
            self._emulator, self._norm_name = _load_emulator(bundle)
        except (ImportError, FileNotFoundError) as error:
            raise IncompleteConfigError(f"SwissTPH emulator bundle {bundle!r} is unavailable: {error}") from error

        outputs = {target["output"] for target in self._emulator.meta["targets"]}
        if not outputs >= REQUIRED_OUTPUTS or not any(t.get("averted") for t in self._emulator.meta["targets"]):
            raise IncompleteConfigError(
                f"SwissTPH emulator bundle {bundle!r} must provide {sorted(REQUIRED_OUTPUTS)} and population"
            )

        self._eir_ci_mean = config.get("eir_ci_mean", "EIR_mean")
        self._eir_ci_lower = config.get("eir_ci_lower", "EIR_lci")
        self._eir_ci_upper = config.get("eir_ci_upper", "EIR_uci")
        self._coverage = self._validate_coverage(config.get("coverage", {}))

    def _validate_coverage(self, coverage: dict) -> dict[str, float]:
        unknown = set(coverage) - set(self._emulator.interventions)
        if unknown:
            raise IncompleteConfigError(f"Unknown interventions in coverage config: {sorted(unknown)}")
        for intervention, value in coverage.items():
            if not isinstance(value, (int, float)) or not 0 <= value <= 1:
                raise IncompleteConfigError(f"Coverage for {intervention} must be a number between 0 and 1")
        return {intervention: float(value) for intervention, value in coverage.items()}

    def get_meta(self) -> ImpactProviderMeta:
        return replace(self.meta, version=metadata.version(EMULATOR_DISTRIBUTION))

    @property
    def supports_bulk(self) -> bool:
        return True

    def match_impact(self, org_unit, interventions, age_group, year_from=None, year_to=None):
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

        coverages = self._build_coverages(interventions)

        known_districts = set(self._emulator.districts)
        matched: dict[str, OrgUnit] = {}
        not_found: list[OrgUnitRef] = []
        for org_unit in org_units:
            district = self._norm_name(self._impact_reference(org_unit))
            if district in known_districts:
                matched[district] = org_unit
            else:
                not_found.append(OrgUnitRef(id=org_unit.id, name=org_unit.name))
        warnings_result = MatchWarnings(org_units_not_found=sorted(not_found, key=lambda ref: ref.name))

        years = self._filter_years(year_from, year_to)
        if not matched or not years or age_group not in self._emulator.meta["age_groups"]:
            return BulkMatchResult(warnings=warnings_result)

        predictions = self._predict(sorted(matched), coverages, years, age_group)
        rows = {
            (row["district"], row["year"], row["EIR_CI"]): row for row in predictions[RESULT_COLUMNS].to_dict("records")
        }

        results: dict[int, list[ImpactResult]] = {}
        for district, org_unit in matched.items():
            results[org_unit.id] = [self._build_result(rows, district, year) for year in years]
        return BulkMatchResult(results=results, warnings=warnings_result)

    def _build_coverages(self, interventions: list[Intervention]) -> dict[str, float]:
        deployed: set[str] = set()
        for intervention in interventions:
            deployed.update(self._map_intervention(intervention))
        return {
            name: self._coverage.get(name, DEFAULT_COVERAGE) if name in deployed else 0.0
            for name in self._emulator.interventions
        }

    def _filter_years(self, year_from: int | None, year_to: int | None) -> list[int]:
        return [
            year
            for year in sorted(self._emulator.meta["years"])
            if (not year_from or year >= int(year_from)) and (not year_to or year <= int(year_to))
        ]

    def _predict(self, districts: list[str], coverages: dict[str, float], years: list[int], age_group: str):
        eir_levels = list(dict.fromkeys([self._eir_ci_mean, self._eir_ci_lower, self._eir_ci_upper]))
        with warnings.catch_warnings(record=True) as caught:
            warnings.simplefilter("always")
            predictions = self._emulator.predict(districts, years=years, ages=[age_group], eir=eir_levels, **coverages)
        for warning in caught:
            logger.info("SwissTPH emulator warning for %s: %s", coverages, warning.message)
        return predictions

    def _build_result(self, rows: dict, district: str, year: int) -> ImpactResult:
        mean = rows[(district, year, self._eir_ci_mean)]
        lower = rows[(district, year, self._eir_ci_lower)]
        upper = rows[(district, year, self._eir_ci_upper)]

        def metric(value: Callable[[dict], float]) -> ImpactMetricWithConfidenceInterval:
            return ImpactMetricWithConfidenceInterval(
                value=float(value(mean)), lower=float(value(lower)), upper=float(value(upper))
            )

        return ImpactResult(
            year=year,
            population=float(mean["population"]),
            number_cases=metric(lambda row: row["incidence"] * row["population"]),
            number_uncomplicated_cases=metric(lambda row: row["uncomplicated"] * row["population"]),
            number_severe_cases=metric(lambda row: row["severe"] * row["population"]),
            prevalence_rate=metric(lambda row: row["prevalence"]),
        )

    def _map_intervention(self, intervention: Intervention) -> set[str]:
        """Resolve an Intervention's impact_ref to the emulator interventions it deploys.

        Raises InterventionMappingError if the impact_ref is empty or unknown.
        """
        impact_ref = (intervention.impact_ref or "").strip()
        if not impact_ref:
            raise InterventionMappingError(f"Intervention '{intervention}' has no impact_ref")
        if impact_ref == BASELINE_IMPACT_REF:
            return set()
        if impact_ref not in self._emulator.interventions:
            raise InterventionMappingError(
                f"Unknown SwissTPH emulator intervention {impact_ref!r} in impact_ref "
                f"for intervention '{intervention}'. "
                f"Known interventions: {sorted(self._known_impact_refs())}"
            )
        return {impact_ref}

    def _known_impact_refs(self) -> list[str]:
        return [*self._emulator.interventions, BASELINE_IMPACT_REF]

    def get_year_range(self) -> tuple[int | None, int | None]:
        years = self._emulator.meta["years"]
        return min(years), max(years)

    def get_age_groups(self) -> list[str]:
        return sorted(self._emulator.meta["age_groups"])

    def get_available_impact_refs(self) -> list[ImpactRefOption]:
        return [ImpactRefOption(ref=ref, label=ref) for ref in sorted(self._known_impact_refs(), key=str.lower)]
