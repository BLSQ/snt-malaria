from typing import Optional

from django.db.models import Avg, Max, Min, Q

from iaso.models import OrgUnit
from plugins.snt_malaria.models import Intervention
from plugins.snt_malaria.models.swisstph_impact import SwissTPHImpactData
from plugins.snt_malaria.providers.impact.base import (
    ImpactMetricWithConfidenceInterval,
    ImpactProvider,
    ImpactResult,
    InterventionMappingError,
    OrgUnitMappingError,
)


SWISSTPH_CMR_DATABASE_ALIAS = "impact_swisstph_cmr"

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


class SwissTPHCMRImpactProvider(ImpactProvider):
    """Impact data provider for SwissTPH CMR database.

    Connects to the SwissTPH CMR impact database via the database alias.
    Matches org units to SwissTPH admin_2 values using source_ref when
    available, falling back to org_unit.name otherwise.
    Uses boolean deployed_int_* columns to filter by intervention deployment status.

    Confidence intervals are derived from the EIR_CI column: each metric is
    averaged over seeds separately for middle (value), low (lower),
    and high (upper).
    """

    @property
    def supports_bulk(self) -> bool:
        return True

    def match_impact(self, org_unit, interventions, age_group, year_from=None, year_to=None):
        # Bulk uses the same query logic; delegate to avoid duplication.
        results = self.match_impact_bulk([org_unit], interventions, age_group, year_from, year_to)
        return results.get(org_unit.id, [])

    def match_impact_bulk(
        self,
        org_units: list[OrgUnit],
        interventions: list[Intervention],
        age_group: str,
        year_from: Optional[int] = None,
        year_to: Optional[int] = None,
    ) -> dict[int, list[ImpactResult]]:
        if not org_units:
            return {}

        deployed_columns: set[str] = set()
        for intervention in interventions:
            deployed_columns.update(self._map_intervention(intervention))

        reference_to_org_unit_id: dict[str, int] = {
            (org_unit.source_ref or org_unit.name): org_unit.id for org_unit in org_units
        }

        filters = {
            "admin_2__in": list(reference_to_org_unit_id.keys()),
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
        rows = (
            SwissTPHImpactData.objects.using(SWISSTPH_CMR_DATABASE_ALIAS)
            .filter(**filters)
            .values("admin_2", "year")
            .annotate(
                mean_n_uncomp=Avg("n_uncomp", filter=Q(eir_ci="middle")),
                lower_n_uncomp=Avg("n_uncomp", filter=Q(eir_ci="low")),
                upper_n_uncomp=Avg("n_uncomp", filter=Q(eir_ci="high")),
                mean_n_severe=Avg("n_severe", filter=Q(eir_ci="middle")),
                lower_n_severe=Avg("n_severe", filter=Q(eir_ci="low")),
                upper_n_severe=Avg("n_severe", filter=Q(eir_ci="high")),
                mean_prevalence_rate=Avg("prevalence_rate", filter=Q(eir_ci="middle")),
                lower_prevalence_rate=Avg("prevalence_rate", filter=Q(eir_ci="low")),
                upper_prevalence_rate=Avg("prevalence_rate", filter=Q(eir_ci="high")),
                mean_n_host=Avg("n_host", filter=Q(eir_ci="middle")),
                mean_expected_direct_deaths=Avg("expected_direct_deaths", filter=Q(eir_ci="middle")),
                lower_expected_direct_deaths=Avg("expected_direct_deaths", filter=Q(eir_ci="low")),
                upper_expected_direct_deaths=Avg("expected_direct_deaths", filter=Q(eir_ci="high")),
            )
            .order_by("admin_2", "year")
        )

        results: dict[int, list[ImpactResult]] = {}
        matched_references: set[str] = set()
        for row in rows:
            org_unit_id = reference_to_org_unit_id.get(row["admin_2"])
            if org_unit_id is None:
                continue

            matched_references.add(row["admin_2"])
            results.setdefault(org_unit_id, []).append(
                ImpactResult(
                    year=row["year"],
                    number_cases=self._build_metric(row, "n_uncomp"),
                    number_severe_cases=self._build_metric(row, "n_severe"),
                    prevalence_rate=self._build_metric(row, "prevalence_rate"),
                    population=row["mean_n_host"] or 0,
                    direct_deaths=self._build_metric(row, "expected_direct_deaths"),
                )
            )

        self._check_unmatched_org_units(reference_to_org_unit_id, matched_references)
        return results

    @staticmethod
    def _build_metric(row: dict, field: str) -> ImpactMetricWithConfidenceInterval:
        return ImpactMetricWithConfidenceInterval(
            value=row[f"mean_{field}"],
            lower=row[f"lower_{field}"],
            upper=row[f"upper_{field}"],
        )

    def get_year_range(self) -> tuple[Optional[int], Optional[int]]:
        result = SwissTPHImpactData.objects.using(SWISSTPH_CMR_DATABASE_ALIAS).aggregate(
            min_year=Min("year"),
            max_year=Max("year"),
        )
        # TODO: get distinct years from the database
        return result["min_year"], result["max_year"]

    def get_age_groups(self) -> list[str]:
        return list(
            SwissTPHImpactData.objects.using(SWISSTPH_CMR_DATABASE_ALIAS)
            .values_list("age_group", flat=True)
            .distinct()
            .order_by("age_group")
        )

    def _check_unmatched_org_units(self, reference_to_org_unit_id, matched_references):
        """Verify unmatched org units actually exist in the impact DB.

        Only runs an extra query when some org units got no results.
        Raises OrgUnitMappingError for references that don't exist at all,
        as opposed to those that simply have no data for the queried intervention mix.
        """
        unmatched = set(reference_to_org_unit_id.keys()) - matched_references
        if not unmatched:
            return
        known = set(
            SwissTPHImpactData.objects.using(SWISSTPH_CMR_DATABASE_ALIAS)
            .filter(admin_2__in=unmatched)
            .values_list("admin_2", flat=True)
            .distinct()
        )
        not_found = unmatched - known
        if not_found:
            raise OrgUnitMappingError(f"Org units not found in SwissTPH impact data: {sorted(not_found)}")

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
