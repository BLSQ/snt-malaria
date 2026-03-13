from decimal import Decimal
from unittest.mock import patch

from django.db import connection
from django.test import TestCase

from plugins.snt_malaria.models.idm_impact import IDMAdminInfo, IDMAgeGroup, IDMInterventionPackage, IDMModelOutput
from plugins.snt_malaria.providers.impact.base import DataIntegrityError, InterventionMappingError
from plugins.snt_malaria.providers.impact.idm import (
    IDM_ALL_INTERVENTION_COLUMNS,
    IDM_DEPLOYED_COVERAGE_ID,
    IDM_NONE_PACKAGE_ID,
    IDMImpactProvider,
)


class MockIntervention:
    """Minimal mock for Intervention model instances used in IDM tests."""

    def __init__(self, impact_ref=""):
        self.impact_ref = impact_ref

    def __str__(self):
        return f"MockIntervention(impact_ref={self.impact_ref!r})"


class MockOrgUnit:
    """Minimal mock for OrgUnit model instances."""

    def __init__(self, id, name, source_ref=None):
        self.id = id
        self.name = name
        self.source_ref = source_ref


# ---------------------------------------------------------------------------
# Intervention package reference data (mirrors the IDM intervention_package table).
# Used both for seeding IDMInterventionPackage rows and for building
# IDMModelOutput test fixtures.
# ---------------------------------------------------------------------------

INTERVENTION_PACKAGES = [
    {"id": 1, "option": "none", "type": "none"},
    {"id": 2, "option": "cm", "type": "cm"},
    {"id": 3, "option": "cm_subsidy", "type": "cm_subsidy"},
    {"id": 4, "option": "smc", "type": "smc"},
    {"id": 5, "option": "pmc", "type": "smc"},
    {"id": 6, "option": "itn_c", "type": "itn_c"},
    {"id": 7, "option": "itn_r", "type": "itn_r"},
    {"id": 8, "option": "irs", "type": "irs"},
    {"id": 9, "option": "vacc", "type": "vacc"},
    {"id": 10, "option": "iptp", "type": "iptp"},
    {"id": 11, "option": "lsm", "type": "lsm"},
]

# Lookup by option for building model_output fixtures: option -> (type/column, package_id)
_PACKAGE_BY_OPTION = {package["option"]: (package["type"], package["id"]) for package in INTERVENTION_PACKAGES}


# ---------------------------------------------------------------------------
# Helpers for building IDMModelOutput test fixtures
# ---------------------------------------------------------------------------


def _baseline_intervention_fields():
    """Return IDMModelOutput kwargs with all interventions set to 'none' (not deployed)."""
    fields = {}
    for column_name in IDM_ALL_INTERVENTION_COLUMNS:
        fields[column_name] = IDM_NONE_PACKAGE_ID
        fields[f"{column_name}_coverage"] = None
    return fields


def _deploy_intervention_fields(deployed_options: list[str]) -> dict:
    """Return IDMModelOutput kwargs with the given interventions deployed.

    Starts from baseline (all fields = none) then activates each listed
    intervention by setting its column to the package ID and its coverage
    to IDM_DEPLOYED_COVERAGE_ID.
    """
    fields = _baseline_intervention_fields()
    for option in deployed_options:
        column_name, package_id = _PACKAGE_BY_OPTION[option]
        fields[column_name] = package_id
        fields[f"{column_name}_coverage"] = IDM_DEPLOYED_COVERAGE_ID
    return fields


# ---------------------------------------------------------------------------
# Build query filter tests (no DB needed -- operates on parsed filter keys)
# ---------------------------------------------------------------------------


class IDMBuildQueryFiltersTests(TestCase):
    def setUp(self):
        self.provider = IDMImpactProvider()

    def test_no_interventions_all_baseline(self):
        filters = self.provider._build_query_filters(set())
        for column_name in IDM_ALL_INTERVENTION_COLUMNS:
            self.assertEqual(
                filters[column_name],
                IDM_NONE_PACKAGE_ID,
                f"{column_name} should be baseline ({IDM_NONE_PACKAGE_ID})",
            )

    def test_single_intervention_deployed(self):
        filters = self.provider._build_query_filters({"cm=2"})
        self.assertEqual(filters["cm"], 2)
        self.assertEqual(filters["cm_coverage"], IDM_DEPLOYED_COVERAGE_ID)
        self.assertEqual(filters["smc"], IDM_NONE_PACKAGE_ID)
        self.assertEqual(filters["itn_c"], IDM_NONE_PACKAGE_ID)

    def test_multiple_interventions_deployed(self):
        filters = self.provider._build_query_filters({"cm=2", "smc=4", "vacc=9"})
        self.assertEqual(filters["cm"], 2)
        self.assertEqual(filters["smc"], 4)
        self.assertEqual(filters["vacc"], 9)
        self.assertEqual(filters["irs"], IDM_NONE_PACKAGE_ID)
        self.assertEqual(filters["itn_c"], IDM_NONE_PACKAGE_ID)
        self.assertEqual(filters["lsm"], IDM_NONE_PACKAGE_ID)

    def test_pmc_uses_smc_column(self):
        """PMC (id=5) uses the smc column in model_output."""
        filters = self.provider._build_query_filters({"smc=5"})
        self.assertEqual(filters["smc"], 5)
        self.assertEqual(filters["smc_coverage"], IDM_DEPLOYED_COVERAGE_ID)


# ---------------------------------------------------------------------------
# Database-backed tests (intervention mapping + integration)
# ---------------------------------------------------------------------------

_IDM_MODELS = [IDMAdminInfo, IDMAgeGroup, IDMInterventionPackage, IDMModelOutput]


class IDMMapInterventionTests(TestCase):
    """Tests for _map_intervention which queries the IDMInterventionPackage table."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        with connection.schema_editor() as schema_editor:
            for model in _IDM_MODELS:
                model._meta.managed = True
                schema_editor.create_model(model)

    @classmethod
    def tearDownClass(cls):
        with connection.schema_editor() as schema_editor:
            for model in reversed(_IDM_MODELS):
                schema_editor.delete_model(model)
        for model in _IDM_MODELS:
            model._meta.managed = False
        super().tearDownClass()

    def setUp(self):
        self._alias_patcher = patch(
            "plugins.snt_malaria.providers.impact.idm.IDM_DATABASE_ALIAS",
            "default",
        )
        self._alias_patcher.start()
        self.provider = IDMImpactProvider()

        for package in INTERVENTION_PACKAGES:
            IDMInterventionPackage.objects.using("default").create(**package)

    def tearDown(self):
        self._alias_patcher.stop()

    def test_valid_impact_ref_resolves_to_filter_key(self):
        """Each 'type:option' impact_ref should resolve to the correct 'column=package_id' filter key."""
        test_cases = [
            ("cm:cm", {"cm=2"}),
            ("cm_subsidy:cm_subsidy", {"cm_subsidy=3"}),
            ("smc:smc", {"smc=4"}),
            ("smc:pmc", {"smc=5"}),
            ("itn_c:itn_c", {"itn_c=6"}),
            ("itn_r:itn_r", {"itn_r=7"}),
            ("irs:irs", {"irs=8"}),
            ("vacc:vacc", {"vacc=9"}),
            ("iptp:iptp", {"iptp=10"}),
            ("lsm:lsm", {"lsm=11"}),
        ]
        for impact_ref, expected_filter_keys in test_cases:
            with self.subTest(impact_ref=impact_ref):
                intervention = MockIntervention(impact_ref=impact_ref)
                result = self.provider._map_intervention(intervention)
                self.assertEqual(result, expected_filter_keys)

    def test_none_intervention_raises_mapping_error(self):
        with self.assertRaises(InterventionMappingError) as context:
            self.provider._map_intervention(None)
        self.assertIn("cannot be None", str(context.exception))

    def test_empty_impact_ref_raises_mapping_error(self):
        intervention = MockIntervention(impact_ref="")
        with self.assertRaises(InterventionMappingError) as context:
            self.provider._map_intervention(intervention)
        self.assertIn("no impact_ref", str(context.exception))

    def test_missing_colon_delimiter_raises_mapping_error(self):
        intervention = MockIntervention(impact_ref="cm_only_no_colon")
        with self.assertRaises(InterventionMappingError) as context:
            self.provider._map_intervention(intervention)
        self.assertIn("Invalid impact_ref format", str(context.exception))
        self.assertIn("type:option", str(context.exception))

    def test_nonexistent_package_raises_mapping_error(self):
        intervention = MockIntervention(impact_ref="nonexistent:nonexistent")
        with self.assertRaises(InterventionMappingError) as context:
            self.provider._map_intervention(intervention)
        self.assertIn("intervention_package not found", str(context.exception))

    def test_mismatched_option_and_type_raises_mapping_error(self):
        """An option that exists but with the wrong type should not match."""
        intervention = MockIntervention(impact_ref="smc:cm")
        with self.assertRaises(InterventionMappingError) as context:
            self.provider._map_intervention(intervention)
        self.assertIn("intervention_package not found", str(context.exception))


class IDMDatabaseIntegrationTests(TestCase):
    """Integration tests that query actual IDM tables seeded with test data.

    The IDM models are unmanaged (managed=False) and normally live in a
    separate database (impact_idm). For testing, we create the tables in the
    default test database and patch IDM_DATABASE_ALIAS to "default" so the
    provider's ORM queries hit that same database.
    """

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        with connection.schema_editor() as schema_editor:
            for model in _IDM_MODELS:
                model._meta.managed = True
                schema_editor.create_model(model)

    @classmethod
    def tearDownClass(cls):
        with connection.schema_editor() as schema_editor:
            for model in reversed(_IDM_MODELS):
                schema_editor.delete_model(model)
        for model in _IDM_MODELS:
            model._meta.managed = False
        super().tearDownClass()

    def setUp(self):
        self._alias_patcher = patch(
            "plugins.snt_malaria.providers.impact.idm.IDM_DATABASE_ALIAS",
            "default",
        )
        self._alias_patcher.start()
        self.provider = IDMImpactProvider()
        using = "default"

        # -- Seed intervention packages --
        for package in INTERVENTION_PACKAGES:
            IDMInterventionPackage.objects.using(using).create(**package)

        # -- Reference data --
        self.admin_kano = IDMAdminInfo.objects.using(using).create(
            admin_2_name="Kano Municipal",
            state="Kano",
            population=500_000,
        )
        self.admin_ikeja = IDMAdminInfo.objects.using(using).create(
            admin_2_name="Ikeja",
            state="Lagos",
            population=800_000,
        )
        self.admin_aboh = IDMAdminInfo.objects.using(using).create(
            admin_2_name="Aboh-Mbaise",
            state="Imo",
            population=300_000,
        )
        self.age_under5 = IDMAgeGroup.objects.using(using).create(id=1, option="under5")
        self.age_all = IDMAgeGroup.objects.using(using).create(id=2, option="allAges")

        # -- Kano: CM deployed (cm=2), 2025 + 2026, allAges --
        IDMModelOutput.objects.using(using).create(
            admin_info_ref=self.admin_kano,
            year=2025,
            age_group_ref=self.age_all,
            clinical_incidence=Decimal("150.5"),
            clinical_incidence_lower=Decimal("140.0"),
            clinical_incidence_higher=Decimal("161.0"),
            severe_incidence=Decimal("15.2"),
            severe_incidence_lower=Decimal("12.0"),
            severe_incidence_higher=Decimal("18.4"),
            prevalence=Decimal("0.35"),
            prevalence_lower=Decimal("0.30"),
            prevalence_higher=Decimal("0.40"),
            **_deploy_intervention_fields(["cm"]),
        )
        IDMModelOutput.objects.using(using).create(
            admin_info_ref=self.admin_kano,
            year=2026,
            age_group_ref=self.age_all,
            clinical_incidence=Decimal("145.2"),
            clinical_incidence_lower=Decimal("135.0"),
            clinical_incidence_higher=Decimal("155.4"),
            severe_incidence=Decimal("14.8"),
            severe_incidence_lower=Decimal("11.5"),
            severe_incidence_higher=Decimal("18.1"),
            prevalence=Decimal("0.33"),
            prevalence_lower=Decimal("0.28"),
            prevalence_higher=Decimal("0.38"),
            **_deploy_intervention_fields(["cm"]),
        )

        # -- Ikeja: CM + SMC deployed, 2025, allAges --
        IDMModelOutput.objects.using(using).create(
            admin_info_ref=self.admin_ikeja,
            year=2025,
            age_group_ref=self.age_all,
            clinical_incidence=Decimal("200.1"),
            clinical_incidence_lower=Decimal("185.0"),
            clinical_incidence_higher=Decimal("215.2"),
            severe_incidence=Decimal("20.5"),
            severe_incidence_lower=Decimal("17.0"),
            severe_incidence_higher=Decimal("24.0"),
            prevalence=Decimal("0.42"),
            prevalence_lower=Decimal("0.37"),
            prevalence_higher=Decimal("0.47"),
            **_deploy_intervention_fields(["cm", "smc"]),
        )

        # -- Kano: CM + SMC deployed, 2025, allAges --
        IDMModelOutput.objects.using(using).create(
            admin_info_ref=self.admin_kano,
            year=2025,
            age_group_ref=self.age_all,
            clinical_incidence=Decimal("120.3"),
            clinical_incidence_lower=Decimal("110.0"),
            clinical_incidence_higher=Decimal("130.6"),
            severe_incidence=Decimal("12.1"),
            severe_incidence_lower=Decimal("9.5"),
            severe_incidence_higher=Decimal("14.7"),
            prevalence=Decimal("0.28"),
            prevalence_lower=Decimal("0.23"),
            prevalence_higher=Decimal("0.33"),
            **_deploy_intervention_fields(["cm", "smc"]),
        )

        # -- Aboh-Mbaise: CM deployed, 2025, allAges (name mapping test) --
        IDMModelOutput.objects.using(using).create(
            admin_info_ref=self.admin_aboh,
            year=2025,
            age_group_ref=self.age_all,
            clinical_incidence=Decimal("180.3"),
            clinical_incidence_lower=Decimal("170.0"),
            clinical_incidence_higher=Decimal("190.6"),
            severe_incidence=Decimal("18.1"),
            severe_incidence_lower=Decimal("15.0"),
            severe_incidence_higher=Decimal("21.2"),
            prevalence=Decimal("0.38"),
            prevalence_lower=Decimal("0.33"),
            prevalence_higher=Decimal("0.43"),
            **_deploy_intervention_fields(["cm"]),
        )

        # -- Kano: CM deployed, 2025, under5 (age group filtering test) --
        IDMModelOutput.objects.using(using).create(
            admin_info_ref=self.admin_kano,
            year=2025,
            age_group_ref=self.age_under5,
            clinical_incidence=Decimal("95.0"),
            clinical_incidence_lower=Decimal("88.0"),
            clinical_incidence_higher=Decimal("102.0"),
            severe_incidence=Decimal("9.5"),
            severe_incidence_lower=Decimal("7.5"),
            severe_incidence_higher=Decimal("11.5"),
            prevalence=Decimal("0.22"),
            prevalence_lower=Decimal("0.18"),
            prevalence_higher=Decimal("0.26"),
            **_deploy_intervention_fields(["cm"]),
        )

    def tearDown(self):
        self._alias_patcher.stop()

    # -- Tests --

    def test_match_with_single_intervention(self):
        """CM deployed: returns matching rows for two districts across years."""
        org_unit_kano = MockOrgUnit(id=101, name="Kano Municipal")
        org_unit_aboh = MockOrgUnit(id=103, name="Aboh Mbaise", source_ref="Aboh-Mbaise")
        case_management = MockIntervention(impact_ref="cm:cm")

        results = self.provider.match_impact_bulk(
            [org_unit_kano, org_unit_aboh],
            interventions=[case_management],
            age_group="allAges",
        )

        self.assertIn(101, results)
        self.assertIn(103, results)
        self.assertEqual(len(results[101]), 2)
        self.assertEqual(len(results[103]), 1)

        # Verify incidence-to-count conversion: 150.5 * 500_000 / 1000 = 75_250
        kano_2025 = results[101][0]
        self.assertEqual(kano_2025.year, 2025)
        self.assertEqual(kano_2025.population, 500_000)
        self.assertAlmostEqual(kano_2025.number_cases.value, 75_250.0, places=1)
        self.assertAlmostEqual(kano_2025.number_cases.lower, 70_000.0, places=1)
        self.assertAlmostEqual(kano_2025.number_cases.upper, 80_500.0, places=1)
        self.assertAlmostEqual(kano_2025.prevalence_rate.value, 0.35, places=2)

        kano_2026 = results[101][1]
        self.assertEqual(kano_2026.year, 2026)

    def test_match_with_multiple_interventions(self):
        """CM + SMC deployed: only rows with that exact package combo are returned."""
        org_unit_kano = MockOrgUnit(id=101, name="Kano Municipal")
        org_unit_ikeja = MockOrgUnit(id=102, name="Ikeja")
        case_management = MockIntervention(impact_ref="cm:cm")
        seasonal_malaria_chemoprevention = MockIntervention(impact_ref="smc:smc")

        results = self.provider.match_impact_bulk(
            [org_unit_kano, org_unit_ikeja],
            interventions=[case_management, seasonal_malaria_chemoprevention],
            age_group="allAges",
        )

        # Kano has a CM+SMC row for 2025 only (not the CM-only rows)
        self.assertEqual(len(results[101]), 1)
        self.assertAlmostEqual(results[101][0].number_cases.value, 60_150.0, places=1)

        # Ikeja has a CM+SMC row for 2025
        self.assertEqual(len(results[102]), 1)
        self.assertAlmostEqual(results[102][0].number_cases.value, 160_080.0, places=1)

    def test_different_intervention_packages_do_not_mix(self):
        """CM-only query should NOT return CM+SMC rows."""
        org_unit_kano = MockOrgUnit(id=101, name="Kano Municipal")
        case_management = MockIntervention(impact_ref="cm:cm")

        results = self.provider.match_impact_bulk(
            [org_unit_kano],
            interventions=[case_management],
            age_group="allAges",
            year_from=2025,
            year_to=2025,
        )

        # Should get the CM-only row (incidence 150.5), not the CM+SMC row (120.3)
        self.assertEqual(len(results[101]), 1)
        self.assertAlmostEqual(results[101][0].number_cases.value, 75_250.0, places=1)

    def test_match_impact_delegates_to_bulk(self):
        org_unit_kano = MockOrgUnit(id=101, name="Kano Municipal")
        case_management = MockIntervention(impact_ref="cm:cm")

        results = self.provider.match_impact(
            org_unit_kano,
            interventions=[case_management],
            age_group="allAges",
        )

        self.assertEqual(len(results), 2)
        self.assertEqual(results[0].year, 2025)
        self.assertEqual(results[1].year, 2026)

    def test_filters_by_year_range(self):
        org_unit_kano = MockOrgUnit(id=101, name="Kano Municipal")
        case_management = MockIntervention(impact_ref="cm:cm")

        results = self.provider.match_impact_bulk(
            [org_unit_kano],
            interventions=[case_management],
            age_group="allAges",
            year_from=2026,
            year_to=2026,
        )

        self.assertEqual(len(results[101]), 1)
        self.assertEqual(results[101][0].year, 2026)

    def test_filters_by_age_group(self):
        """under5 age group only returns the under5 row, not the allAges rows."""
        org_unit_kano = MockOrgUnit(id=101, name="Kano Municipal")
        case_management = MockIntervention(impact_ref="cm:cm")

        results = self.provider.match_impact_bulk(
            [org_unit_kano],
            interventions=[case_management],
            age_group="under5",
        )

        self.assertEqual(len(results[101]), 1)
        # 95.0 * 500_000 / 1000 = 47_500
        self.assertAlmostEqual(results[101][0].number_cases.value, 47_500.0, places=1)

    def test_name_fallback_when_no_source_ref(self):
        """Without source_ref, the org unit name is used directly to match admin_2_name."""
        org_unit_kano = MockOrgUnit(id=101, name="Kano Municipal")
        case_management = MockIntervention(impact_ref="cm:cm")

        results = self.provider.match_impact_bulk(
            [org_unit_kano],
            interventions=[case_management],
            age_group="allAges",
        )

        self.assertIn(101, results)
        self.assertEqual(len(results[101]), 2)

    def test_name_fallback_no_match_when_names_differ(self):
        """Without source_ref, mismatched names do not match."""
        org_unit_aboh = MockOrgUnit(id=103, name="Aboh Mbaise")
        case_management = MockIntervention(impact_ref="cm:cm")

        results = self.provider.match_impact_bulk(
            [org_unit_aboh],
            interventions=[case_management],
            age_group="allAges",
        )

        self.assertEqual(results, {})

    def test_source_ref_used_for_matching(self):
        """When source_ref is set, it is used to match against admin_2_name."""
        org_unit = MockOrgUnit(id=103, name="Wrong Name", source_ref="Aboh-Mbaise")
        case_management = MockIntervention(impact_ref="cm:cm")

        results = self.provider.match_impact_bulk(
            [org_unit],
            interventions=[case_management],
            age_group="allAges",
        )

        self.assertIn(103, results)
        self.assertEqual(len(results[103]), 1)
        self.assertEqual(results[103][0].year, 2025)

    def test_source_ref_takes_precedence_over_name(self):
        """source_ref should be used instead of the org unit name."""
        org_unit = MockOrgUnit(id=103, name="Ikeja", source_ref="Kano Municipal")
        case_management = MockIntervention(impact_ref="cm:cm")

        results = self.provider.match_impact_bulk(
            [org_unit],
            interventions=[case_management],
            age_group="allAges",
        )

        self.assertIn(103, results)
        self.assertEqual(len(results[103]), 2)
        self.assertEqual(results[103][0].year, 2025)
        self.assertEqual(results[103][1].year, 2026)

    def test_no_match_when_source_ref_wrong(self):
        """A wrong source_ref should not match even if the name would match directly."""
        org_unit = MockOrgUnit(id=103, name="Kano Municipal", source_ref="Nonexistent")
        case_management = MockIntervention(impact_ref="cm:cm")

        results = self.provider.match_impact_bulk(
            [org_unit],
            interventions=[case_management],
            age_group="allAges",
        )

        self.assertEqual(results, {})

    def test_no_match_returns_empty(self):
        org_unit_unknown = MockOrgUnit(id=999, name="Nonexistent District")
        case_management = MockIntervention(impact_ref="cm:cm")

        results = self.provider.match_impact_bulk(
            [org_unit_unknown],
            interventions=[case_management],
            age_group="allAges",
        )

        self.assertEqual(results, {})

    def test_unknown_age_group_returns_empty(self):
        org_unit_kano = MockOrgUnit(id=101, name="Kano Municipal")
        case_management = MockIntervention(impact_ref="cm:cm")

        results = self.provider.match_impact_bulk(
            [org_unit_kano],
            interventions=[case_management],
            age_group="nonexistent",
        )

        self.assertEqual(results, {})

    def test_duplicate_year_raises_data_integrity_error(self):
        """Conflicting rows for the same (admin, year, intervention combo) raise DataIntegrityError."""
        IDMModelOutput.objects.using("default").create(
            admin_info_ref=self.admin_kano,
            year=2025,
            age_group_ref=self.age_all,
            clinical_incidence=Decimal("999.0"),
            clinical_incidence_lower=Decimal("990.0"),
            clinical_incidence_higher=Decimal("1010.0"),
            severe_incidence=Decimal("99.0"),
            severe_incidence_lower=Decimal("90.0"),
            severe_incidence_higher=Decimal("110.0"),
            prevalence=Decimal("0.99"),
            prevalence_lower=Decimal("0.95"),
            prevalence_higher=Decimal("1.00"),
            **_deploy_intervention_fields(["cm"]),
        )

        org_unit_kano = MockOrgUnit(id=101, name="Kano Municipal")
        case_management = MockIntervention(impact_ref="cm:cm")
        with self.assertRaises(DataIntegrityError) as context:
            self.provider.match_impact_bulk(
                [org_unit_kano],
                interventions=[case_management],
                age_group="allAges",
            )
        self.assertIn("conflicting rows", str(context.exception))

    def test_get_year_range(self):
        min_year, max_year = self.provider.get_year_range()
        self.assertEqual(min_year, 2025)
        self.assertEqual(max_year, 2026)

    def test_get_age_groups(self):
        age_groups = self.provider.get_age_groups()
        self.assertEqual(age_groups, ["allAges", "under5"])
