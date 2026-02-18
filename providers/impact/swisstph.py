from typing import Optional

from django.db.models import Avg, Count, Max, Min

from iaso.models import OrgUnit
from plugins.snt_malaria.models import Intervention
from plugins.snt_malaria.models.swisstph_impact import SwissTPHImpactData
from plugins.snt_malaria.providers.impact.base import ImpactProvider, ImpactResult
from plugins.snt_malaria.types import MetricWithCI


SWISSTPH_DATABASE_ALIAS = "impact_swisstph"

INTERVENTION_COLUMN_MAP = {
    "cm_public": "deployed_int_iCCM",
    "iptp": "deployed_int_IPTSc",
    "pmc": "deployed_int_PMC",
    "vacc": "deployed_int_Vaccine",
    "smc": "deployed_int_SMC",
    "irs": "deployed_int_IRS",
}

ITN_STANDARD_CODES = {"itn_campaign"}
PBO_CODES = {"itn_campaign_pbo"}
IG2_CODES = {"itn_campaign_ig2"}

KNOWN_DEPLOYED_COLUMNS = {
    "deployed_int_IPTSc",
    "deployed_int_IG2",
    "deployed_int_PBO",
    "deployed_int_PMC",
    "deployed_int_SMC",
    "deployed_int_Vaccine",
    "deployed_int_ITN",
    "deployed_int_IRS",
    "deployed_int_iCCM",
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
                avg_nUncomp=Avg("nUncomp"),
                min_nUncomp=Min("nUncomp"),
                max_nUncomp=Max("nUncomp"),
                avg_nSevere=Avg("nSevere"),
                min_nSevere=Min("nSevere"),
                max_nSevere=Max("nSevere"),
                avg_prevalenceRate=Avg("prevalenceRate"),
                min_prevalenceRate=Min("prevalenceRate"),
                max_prevalenceRate=Max("prevalenceRate"),
                avg_nHost=Avg("nHost"),
                avg_expectedDirectDeaths=Avg("expectedDirectDeaths"),
                min_expectedDirectDeaths=Min("expectedDirectDeaths"),
                max_expectedDirectDeaths=Max("expectedDirectDeaths"),
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

            results.setdefault(ou_id, []).append(ImpactResult(
                year=row["year"],
                number_cases=MetricWithCI(
                    row["avg_nUncomp"], row["min_nUncomp"], row["max_nUncomp"]
                ),
                number_severe_cases=MetricWithCI(
                    row["avg_nSevere"], row["min_nSevere"], row["max_nSevere"]
                ),
                prevalence_rate=MetricWithCI(
                    row["avg_prevalenceRate"], row["min_prevalenceRate"], row["max_prevalenceRate"]
                ),
                population=row["avg_nHost"] or 0,
                direct_deaths=MetricWithCI(
                    row["avg_expectedDirectDeaths"],
                    row["min_expectedDirectDeaths"],
                    row["max_expectedDirectDeaths"],
                ),
            ))

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
        """Map an Iaso Intervention to SwissTPH deployed_int_* column names."""
        code = (intervention.code or "").lower().strip()
        name = (intervention.name or "").lower().strip()
        columns: set[str] = set()

        if code in PBO_CODES or "pbo" in name:
            columns.add("deployed_int_PBO")
        elif code in IG2_CODES or "dual ai" in name or "ig2" in name:
            columns.add("deployed_int_IG2")
        elif code in ITN_STANDARD_CODES and ("standard" in name or "pyrethroid" in name):
            columns.add("deployed_int_ITN")
        elif code in ITN_STANDARD_CODES:
            columns.add("deployed_int_ITN")
        elif code in INTERVENTION_COLUMN_MAP:
            columns.add(INTERVENTION_COLUMN_MAP[code])

        return columns

    def _build_query_filters(self, deployed_columns: set[str]) -> dict:
        """Build the deployed_int_* filter dict for a given set of deployed columns."""
        has_any_net = any(
            col in deployed_columns
            for col in ["deployed_int_ITN", "deployed_int_PBO", "deployed_int_IG2"]
        )
        filters = {}
        for column in KNOWN_DEPLOYED_COLUMNS:
            if column == "deployed_int_ITN":
                filters[column] = has_any_net
            else:
                filters[column] = column in deployed_columns
        return filters
