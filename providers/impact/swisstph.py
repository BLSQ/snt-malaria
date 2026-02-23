from typing import Optional

from django.db.models import Avg, Count, Max, Min

from iaso.models import OrgUnit
from plugins.snt_malaria.models import Intervention
from plugins.snt_malaria.models.swisstph_impact import SwissTPHImpactData
from plugins.snt_malaria.providers.impact.base import ImpactProvider, ImpactResult
from plugins.snt_malaria.types import ImpactMetricWithConfidenceInterval


SWISSTPH_DATABASE_ALIAS = "impact_swisstph"

INTERVENTION_COLUMN_MAP = {
    "cm_public": "deployed_int_iccm",
    "iptp": "deployed_int_iptsc",
    "pmc": "deployed_int_pmc",
    "vacc": "deployed_int_vaccine",
    "smc": "deployed_int_smc",
    "irs": "deployed_int_irs",
}

ITN_STANDARD_CODES = {"itn_campaign"}
PBO_CODES = {"itn_campaign_pbo"}
IG2_CODES = {"itn_campaign_ig2"}

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
}


class SwissTPHImpactProvider(ImpactProvider):
    """Impact data provider for SwissTPH database.

    Connects to the SwissTPH impact database via the database alias.
    Matches org units by admin_1 name. Uses boolean deployed_int_* columns
    to filter by intervention deployment status.

    Confidence intervals are derived by aggregating across all statistical seeds:
    value = Avg, lower = Min, upper = Max.
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

        name_to_ou_id: dict[str, int] = {ou.name: ou.id for ou in org_units}

        filters = {
            "admin_1__in": list(name_to_ou_id.keys()),
            "age_group": age_group,
        }
        if year_from:
            filters["year__gte"] = int(year_from)
        if year_to:
            filters["year__lte"] = int(year_to)

        filters.update(self._build_query_filters(deployed_columns))

        # Aggregate across seeds per (admin_1, year): Avg for central value, Min/Max for CI.
        # seed_count vs row_count validates that each seed appears only once per year.
        rows = (
            SwissTPHImpactData.objects.using(SWISSTPH_DATABASE_ALIAS)
            .filter(**filters)
            .values("admin_1", "year")
            .annotate(
                seed_count=Count("seed", distinct=True),
                row_count=Count("impact_index"),
                avg_n_uncomp=Avg("n_uncomp"),
                min_n_uncomp=Min("n_uncomp"),
                max_n_uncomp=Max("n_uncomp"),
                avg_n_severe=Avg("n_severe"),
                min_n_severe=Min("n_severe"),
                max_n_severe=Max("n_severe"),
                avg_prevalence_rate=Avg("prevalence_rate"),
                min_prevalence_rate=Min("prevalence_rate"),
                max_prevalence_rate=Max("prevalence_rate"),
                avg_n_host=Avg("n_host"),
                avg_expected_direct_deaths=Avg("expected_direct_deaths"),
                min_expected_direct_deaths=Min("expected_direct_deaths"),
                max_expected_direct_deaths=Max("expected_direct_deaths"),
            )
            .order_by("admin_1", "year")
        )

        results: dict[int, list[ImpactResult]] = {}
        for row in rows:
            ou_id = name_to_ou_id.get(row["admin_1"])
            if ou_id is None:
                continue

            if row["row_count"] != row["seed_count"]:
                raise ValueError(
                    f"SwissTPH: year {row['year']} (admin_1={row['admin_1']!r}) "
                    f"has {row['row_count']} rows but {row['seed_count']} distinct seeds. "
                    f"Each (year, seed) must be unique."
                )

            results.setdefault(ou_id, []).append(
                ImpactResult(
                    year=row["year"],
                    number_cases=ImpactMetricWithConfidenceInterval(
                        row["avg_n_uncomp"], row["min_n_uncomp"], row["max_n_uncomp"]
                    ),
                    number_severe_cases=ImpactMetricWithConfidenceInterval(
                        row["avg_n_severe"], row["min_n_severe"], row["max_n_severe"]
                    ),
                    prevalence_rate=ImpactMetricWithConfidenceInterval(
                        row["avg_prevalence_rate"], row["min_prevalence_rate"], row["max_prevalence_rate"]
                    ),
                    population=row["avg_n_host"] or 0,
                    direct_deaths=ImpactMetricWithConfidenceInterval(
                        row["avg_expected_direct_deaths"],
                        row["min_expected_direct_deaths"],
                        row["max_expected_direct_deaths"],
                    ),
                )
            )

        return results

    def get_year_range(self) -> tuple[Optional[int], Optional[int]]:
        result = SwissTPHImpactData.objects.using(SWISSTPH_DATABASE_ALIAS).aggregate(
            min_year=Min("year"),
            max_year=Max("year"),
        )
        return result["min_year"], result["max_year"]

    def get_age_groups(self) -> list[str]:
        return list(
            SwissTPHImpactData.objects.using(SWISSTPH_DATABASE_ALIAS)
            .values_list("age_group", flat=True)
            .distinct()
            .order_by("age_group")
        )

    def _map_intervention(self, intervention: Intervention) -> set[str]:
        """Map an Iaso Intervention to SwissTPH deployed_int_* (Pythonic) field names."""
        code = (intervention.code or "").lower().strip()
        name = (intervention.name or "").lower().strip()
        columns: set[str] = set()

        if code in PBO_CODES or "pbo" in name:
            columns.add("deployed_int_pbo")
        elif code in IG2_CODES or "dual ai" in name or "ig2" in name:
            columns.add("deployed_int_ig2")
        elif code in ITN_STANDARD_CODES and ("standard" in name or "pyrethroid" in name) or code in ITN_STANDARD_CODES:
            columns.add("deployed_int_itn")
        elif code in INTERVENTION_COLUMN_MAP:
            columns.add(INTERVENTION_COLUMN_MAP[code])

        return columns

    def _build_query_filters(self, deployed_columns: set[str]) -> dict:
        """Build the deployed_int_* filter dict for a given set of deployed columns."""
        has_any_net = any(
            col in deployed_columns for col in ["deployed_int_itn", "deployed_int_pbo", "deployed_int_ig2"]
        )
        filters = {}
        for column in KNOWN_DEPLOYED_COLUMNS:
            if column == "deployed_int_itn":
                filters[column] = has_any_net
            else:
                filters[column] = column in deployed_columns
        return filters
