from typing import Optional

from django.db.models import Max, Min

from iaso.models import OrgUnit
from plugins.snt_malaria.models import Intervention
from plugins.snt_malaria.models.idm_impact import IDMAgeGroup, IDMInterventionPackage, IDMModelOutput
from plugins.snt_malaria.providers.impact.base import (
    DataIntegrityError,
    ImpactMetricWithConfidenceInterval,
    ImpactProvider,
    ImpactResult,
    InterventionMappingError,
)


IDM_DATABASE_ALIAS = "impact_idm"

# Baseline intervention_package ID (none = no intervention deployed)
IDM_NONE_PACKAGE_ID = 1

# Hard-coded coverage ID used when an intervention is deployed.
# 1 = "current" coverage. TODO: implement coverage selection.
IDM_DEPLOYED_COVERAGE_ID = 1

# All intervention columns in model_output that need to be set when building filters.
IDM_ALL_INTERVENTION_COLUMNS = [
    "cm",
    "cm_subsidy",
    "smc",
    "itn_c",
    "itn_r",
    "irs",
    "vacc",
    "iptp",
    "lsm",
]


class IDMImpactProvider(ImpactProvider):
    """Impact data provider for IDM database.

    Connects to the IDM impact database via the database alias.
    Matches org units to IDM admin_2_name values using source_ref when
    available, falling back to org_unit.name otherwise.
    Uses intervention_package IDs to filter model_output rows by
    intervention deployment status.
    """

    def __init__(self):
        self._cached_intervention_packages = None

    def _resolve_intervention_package(self, type_value, option_value):
        """Look up an IDMInterventionPackage by (type, option), lazy-loading the cache on first call."""
        if self._cached_intervention_packages is None:
            self._cached_intervention_packages = {
                (pkg.type, pkg.option): pkg for pkg in IDMInterventionPackage.objects.using(IDM_DATABASE_ALIAS).all()
            }
        return self._cached_intervention_packages.get((type_value, option_value))

    @property
    def supports_bulk(self) -> bool:
        return True

    @staticmethod
    def _incidence_to_count(incidence, population):
        """Convert an incidence rate (per 1,000 person-years) to an absolute count.

        This is a temporary workaround. IDM should provide absolute counts
        directly so we don't carry the responsibility of potentially incorrect
        rate-to-count conversions.
        """
        if incidence is not None and population:
            return float(incidence) * population / 1000
        return None

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

        age_group_id = self._resolve_age_group_id(age_group)
        if age_group_id is None:
            return {}

        filter_keys: set[str] = set()
        for intervention in interventions:
            filter_keys.update(self._map_intervention(intervention))

        reference_to_ou_id: dict[str, int] = {(ou.source_ref or ou.name): ou.id for ou in org_units}

        filters = {
            "admin_info_ref__admin_2_name__in": list(reference_to_ou_id.keys()),
            "age_group_ref_id": age_group_id,
        }
        if year_from:
            filters["year__gte"] = int(year_from)
        if year_to:
            filters["year__lte"] = int(year_to)

        filters.update(self._build_query_filters(filter_keys))

        # Use .values().distinct() to collapse exact duplicate rows (same
        # metric data, different IDs) at the DB level.
        metric_fields = [
            "admin_info_ref__admin_2_name",
            "year",
            "admin_info_ref__population",
            "clinical_incidence",
            "clinical_incidence_lower",
            "clinical_incidence_higher",
            "severe_incidence",
            "severe_incidence_lower",
            "severe_incidence_higher",
            "prevalence",
            "prevalence_lower",
            "prevalence_higher",
        ]
        impact_rows = (
            IDMModelOutput.objects.using(IDM_DATABASE_ALIAS)
            .filter(**filters)
            .values(*metric_fields)
            .distinct()
            .order_by("admin_info_ref__admin_2_name", "year")
        )

        results: dict[int, list[ImpactResult]] = {}
        seen_years_by_ou: dict[int, set[int]] = {}

        for row in impact_rows:
            admin_name = row["admin_info_ref__admin_2_name"]
            ou_id = reference_to_ou_id.get(admin_name)
            if ou_id is None:
                continue

            if ou_id not in seen_years_by_ou:
                seen_years_by_ou[ou_id] = set()
                results[ou_id] = []

            if row["year"] in seen_years_by_ou[ou_id]:
                raise DataIntegrityError(
                    f"IDM: conflicting rows for year {row['year']} "
                    f"(admin_2_name={admin_name!r}, age_group_id={age_group_id}). "
                    f"Expected identical metric data per year."
                )
            seen_years_by_ou[ou_id].add(row["year"])

            pop = row["admin_info_ref__population"] or 0

            results[ou_id].append(
                ImpactResult(
                    year=row["year"],
                    number_cases=ImpactMetricWithConfidenceInterval(
                        self._incidence_to_count(row["clinical_incidence"], pop),
                        self._incidence_to_count(row["clinical_incidence_lower"], pop),
                        self._incidence_to_count(row["clinical_incidence_higher"], pop),
                    ),
                    number_severe_cases=ImpactMetricWithConfidenceInterval(
                        self._incidence_to_count(row["severe_incidence"], pop),
                        self._incidence_to_count(row["severe_incidence_lower"], pop),
                        self._incidence_to_count(row["severe_incidence_higher"], pop),
                    ),
                    prevalence_rate=ImpactMetricWithConfidenceInterval(
                        float(row["prevalence"]) if row["prevalence"] is not None else None,
                        float(row["prevalence_lower"]) if row["prevalence_lower"] is not None else None,
                        float(row["prevalence_higher"]) if row["prevalence_higher"] is not None else None,
                    ),
                    population=pop,
                    direct_deaths=ImpactMetricWithConfidenceInterval(),
                )
            )

        return results

    def get_year_range(self) -> tuple[Optional[int], Optional[int]]:
        result = IDMModelOutput.objects.using(IDM_DATABASE_ALIAS).aggregate(
            min_year=Min("year"),
            max_year=Max("year"),
        )
        return result["min_year"], result["max_year"]

    def get_age_groups(self) -> list[str]:
        return list(IDMAgeGroup.objects.using(IDM_DATABASE_ALIAS).values_list("option", flat=True).order_by("option"))

    def _map_intervention(self, intervention: Intervention) -> set[str]:
        """Resolve an Intervention's impact_ref to an IDM filter key ('column_name=package_id').

        The impact_ref is expected to be in 'type:option' format, where type
        and option correspond to the columns of the IDM intervention_package table.
        Intervention resolution uses cached intervention packages to avoid repeated database queries.

        Raises InterventionMappingError if the intervention is None, has no impact_ref,
        the format is invalid, or no matching intervention_package row exists.
        """
        if intervention is None:
            raise InterventionMappingError("intervention cannot be None")

        impact_reference = (intervention.impact_ref or "").strip()
        if not impact_reference:
            raise InterventionMappingError(f"Intervention '{intervention}' has no impact_ref")

        parts = impact_reference.split(":")
        if len(parts) != 2:
            raise InterventionMappingError(
                f"Invalid impact_ref format {impact_reference!r}. Expected 'type:option' (e.g. 'smc:pmc')."
            )

        type_value, option_value = parts
        package = self._resolve_intervention_package(type_value, option_value)
        if package is None:
            raise InterventionMappingError(
                f"IDM intervention_package not found for option={option_value!r}, type={type_value!r}."
            )

        return {f"{package.type}={package.id}"}

    def _build_query_filters(self, filter_keys: set[str]) -> dict:
        """Build ORM filter kwargs for IDM model_output.

        Each filter key has the format 'column_name=package_id'. For every
        intervention column in model_output, the filter is set to the deployed
        package ID if the intervention is active, or to IDM_NONE_PACKAGE_ID (1)
        if not deployed.
        """
        deployed_interventions: dict[str, int] = {}
        for key in filter_keys:
            column_name, package_id = key.split("=")
            deployed_interventions[column_name] = int(package_id)

        filters: dict = {}
        for column_name in IDM_ALL_INTERVENTION_COLUMNS:
            if column_name in deployed_interventions:
                filters[column_name] = deployed_interventions[column_name]
                filters[f"{column_name}_coverage"] = IDM_DEPLOYED_COVERAGE_ID
            else:
                filters[column_name] = IDM_NONE_PACKAGE_ID
                filters[f"{column_name}_coverage__isnull"] = True

        return filters

    def _resolve_age_group_id(self, age_group_label):
        """Resolve an age group label (e.g. 'under5') to its IDM database ID."""
        try:
            age_group = IDMAgeGroup.objects.using(IDM_DATABASE_ALIAS).get(option=age_group_label)
            return age_group.id
        except IDMAgeGroup.DoesNotExist:
            return None
