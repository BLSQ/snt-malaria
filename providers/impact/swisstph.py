from typing import Optional

from django.db.models import Avg, Max, Min, Q

from iaso.models import OrgUnit
from plugins.snt_malaria.models import Intervention
from plugins.snt_malaria.models.swisstph_impact import SwissTPHImpactData
from plugins.snt_malaria.providers.impact.base import (
    BulkMatchResult,
    ImpactMetricWithConfidenceInterval,
    ImpactProvider,
    ImpactResult,
    InterventionMappingError,
    MatchResult,
    MatchWarnings,
    OrgUnitRef,
)
from plugins.snt_malaria.providers.impact.db import ensure_db_connection


KNOWN_DEPLOYED_COLUMNS = {
    "deployed_int_iptsc",
    "deployed_int_ig2",
    "deployed_int_pbo",
    "deployed_int_pmc",
    "deployed_int_smc",
    "deployed_int_vaccine",
    "deployed_int_itn",
    "deployed_int_irs",
    "deployed_int_iccm",
    "deployed_int_lsm",
    "deployed_int_cm",
}


class SwissTPHImpactProvider(ImpactProvider):
    """Impact data provider for SwissTPH databases.

    Connects to a SwissTPH impact database via a dynamically registered
    database alias derived from the provider configuration.
    Matches org units using ImpactOrgUnitMapping when available, falling back
    to org_unit.name otherwise.
    Uses boolean deployed_int_* columns to filter by intervention deployment status.

    The following keys in the config JSON control provider behaviour:

    - ``admin_field`` – the SwissTPHImpactData column used for org-unit
      matching (default ``"admin_1"``).
    - ``eir_ci_mean``, ``eir_ci_lower``, ``eir_ci_upper`` – the values
      stored in the ``eir_ci`` column that correspond to the mean, lower,
      and upper confidence-interval bands (defaults ``"EIR_mean"``,
      ``"EIR_lci"``, ``"EIR_uci"``).
    """

    def __init__(self, config_id: int, config: dict, secret: str):
        super().__init__(config_id, config, secret)
        self._db_alias = ensure_db_connection(config_id, config, secret)
        self._admin_field = config.get("admin_field", "admin_1")
        self._eir_ci_mean = config.get("eir_ci_mean", "EIR_mean")
        self._eir_ci_lower = config.get("eir_ci_lower", "EIR_lci")
        self._eir_ci_upper = config.get("eir_ci_upper", "EIR_uci")

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
        year_from: Optional[int] = None,
        year_to: Optional[int] = None,
    ) -> BulkMatchResult:
        if not org_units:
            return BulkMatchResult()

        deployed_columns: set[str] = set()
        for intervention in interventions:
            deployed_columns.update(self._map_intervention(intervention))

        reference_to_org_unit: dict[str, OrgUnit] = {
            self._impact_reference(org_unit): org_unit for org_unit in org_units
        }

        filters = {
            f"{self._admin_field}__in": list(reference_to_org_unit.keys()),
            "age_group": age_group,
        }
        if year_from:
            filters["year__gte"] = int(year_from)
        if year_to:
            filters["year__lte"] = int(year_to)

        filters.update(self._build_query_filters(deployed_columns))

        # NOTE: if the source data contains duplicate rows for the same
        # admin_1, age_group, year, seed, eir_ci and intervention mix, they
        # will be silently averaged into the results. We assume this is
        # acceptable because identical intervention mixes should produce
        # identical results. See test_duplicate_rows_are_averaged_transparently.
        eir_mean = Q(eir_ci=self._eir_ci_mean)
        eir_lower = Q(eir_ci=self._eir_ci_lower)
        eir_upper = Q(eir_ci=self._eir_ci_upper)

        rows = (
            SwissTPHImpactData.objects.using(self._db_alias)
            .filter(**filters)
            .values(self._admin_field, "year")
            .annotate(
                mean_n_uncomp=Avg("n_uncomp", filter=eir_mean),
                lower_n_uncomp=Avg("n_uncomp", filter=eir_lower),
                upper_n_uncomp=Avg("n_uncomp", filter=eir_upper),
                mean_n_severe=Avg("n_severe", filter=eir_mean),
                lower_n_severe=Avg("n_severe", filter=eir_lower),
                upper_n_severe=Avg("n_severe", filter=eir_upper),
                mean_prevalence_rate=Avg("prevalence_rate", filter=eir_mean),
                lower_prevalence_rate=Avg("prevalence_rate", filter=eir_lower),
                upper_prevalence_rate=Avg("prevalence_rate", filter=eir_upper),
                mean_n_host=Avg("n_host", filter=eir_mean),
                mean_expected_direct_deaths=Avg("expected_direct_deaths", filter=eir_mean),
                lower_expected_direct_deaths=Avg("expected_direct_deaths", filter=eir_lower),
                upper_expected_direct_deaths=Avg("expected_direct_deaths", filter=eir_upper),
            )
            .order_by(self._admin_field, "year")
        )

        results: dict[int, list[ImpactResult]] = {}
        matched_references: set[str] = set()
        for row in rows:
            org_unit = reference_to_org_unit.get(row[self._admin_field])
            if org_unit is None:
                continue

            matched_references.add(row[self._admin_field])
            results.setdefault(org_unit.id, []).append(
                ImpactResult(
                    year=row["year"],
                    number_cases=self._build_metric(row, "n_uncomp"),
                    number_severe_cases=self._build_metric(row, "n_severe"),
                    prevalence_rate=self._build_metric(row, "prevalence_rate"),
                    population=row["mean_n_host"] or 0,
                    direct_deaths=self._build_metric(row, "expected_direct_deaths"),
                )
            )

        warnings = self._check_unmatched_org_units(reference_to_org_unit, matched_references)
        return BulkMatchResult(results=results, warnings=warnings)

    @staticmethod
    def _build_metric(row: dict, field: str) -> ImpactMetricWithConfidenceInterval:
        return ImpactMetricWithConfidenceInterval(
            value=row[f"mean_{field}"],
            lower=row[f"lower_{field}"],
            upper=row[f"upper_{field}"],
        )

    def get_year_range(self) -> tuple[Optional[int], Optional[int]]:
        result = SwissTPHImpactData.objects.using(self._db_alias).aggregate(
            min_year=Min("year"),
            max_year=Max("year"),
        )
        # TODO: get distinct years from the database
        return result["min_year"], result["max_year"]

    def get_age_groups(self) -> list[str]:
        return list(
            SwissTPHImpactData.objects.using(self._db_alias)
            .values_list("age_group", flat=True)
            .distinct()
            .order_by("age_group")
        )

    def _check_unmatched_org_units(self, reference_to_org_unit, matched_references) -> MatchWarnings:
        """Classify unmatched org units into 'not found' vs 'unmatched interventions'.

        Only runs an extra query when some org units got no results.
        Returns MatchWarnings with the two categories populated.
        """
        warnings = MatchWarnings()
        unmatched = set(reference_to_org_unit.keys()) - matched_references
        if not unmatched:
            return warnings
        known = set(
            SwissTPHImpactData.objects.using(self._db_alias)
            .filter(**{f"{self._admin_field}__in": unmatched})
            .values_list(self._admin_field, flat=True)
            .distinct()
        )
        not_found = unmatched - known
        known_but_unmatched = unmatched & known
        warnings.org_units_not_found = [
            OrgUnitRef(id=reference_to_org_unit[ref].id, name=reference_to_org_unit[ref].name)
            for ref in sorted(not_found)
        ]
        warnings.org_units_with_unmatched_interventions = [
            OrgUnitRef(id=reference_to_org_unit[ref].id, name=reference_to_org_unit[ref].name)
            for ref in sorted(known_but_unmatched)
        ]
        return warnings

    def _map_intervention(self, intervention: Intervention) -> set[str]:
        """Resolve an Intervention's impact_ref to SwissTPH deployed_int_* columns.

        The impact_ref can be a single column name (e.g. 'deployed_int_smc')
        or a comma-separated list when one intervention maps to multiple
        columns (e.g. 'deployed_int_pbo,deployed_int_itn').

        Raises InterventionMappingError if the impact_ref is empty or contains
        unrecognised column names.
        """
        raw_reference = (intervention.impact_ref or "").strip()
        if not raw_reference:
            raise InterventionMappingError(f"Intervention '{intervention}' has no impact_ref")

        matched_columns = set()
        for column_name in raw_reference.split(","):
            column_name = column_name.strip()
            if column_name not in KNOWN_DEPLOYED_COLUMNS:
                raise InterventionMappingError(
                    f"Unknown SwissTPH column {column_name!r} in impact_ref "
                    f"for intervention '{intervention}'. "
                    f"Known columns: {sorted(KNOWN_DEPLOYED_COLUMNS)}"
                )
            matched_columns.add(column_name)

        return matched_columns

    def _build_query_filters(self, deployed_columns: set[str]) -> dict:
        """Build a filter dict for all deployed_int_* boolean columns.

        Each known column is set to True if it appears in deployed_columns,
        False otherwise. This ensures the query matches only rows with the
        exact combination of deployed interventions.
        """
        return {column: column in deployed_columns for column in KNOWN_DEPLOYED_COLUMNS}
