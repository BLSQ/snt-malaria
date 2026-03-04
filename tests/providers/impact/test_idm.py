from decimal import Decimal
from unittest.mock import patch

from django.db import connection
from django.test import TestCase

from plugins.snt_malaria.models.idm_impact import IDMAdminInfo, IDMAgeGroup, IDMModelOutput
from plugins.snt_malaria.providers.impact.idm import (
    IDM_ALL_INTERVENTION_COLUMNS,
    IDM_DEPLOYED_COVERAGE_ID,
    IDM_INTERVENTIONS,
    IDM_NONE_PACKAGE_ID,
    IDMImpactProvider,
)


class MockIntervention:
    """Minimal mock for Intervention model instances."""

    def __init__(self, code, name=""):
        self.code = code
        self.name = name


class MockOrgUnit:
    """Minimal mock for OrgUnit model instances."""

    def __init__(self, id, name):
        self.id = id
        self.name = name


class IDMImpactProviderMapInterventionTests(TestCase):
    def setUp(self):
        self.provider = IDMImpactProvider()

    def test_intervention_mapping(self):
        cases = [
            ("cm_public", "", {"cm=2"}),
            ("cm_subsidy", "", {"cm_subsidy=3"}),
            ("smc", "", {"smc=4"}),
            ("pmc", "", {"smc=5"}),
            ("itn_campaign", "", {"itn_c=6"}),
            ("itn_campaign", "PBO", {"itn_c=6"}),
            ("itn_campaign", "Dual AI", {"itn_c=6"}),
            ("itn_routine", "", {"itn_r=7"}),
            ("irs", "", {"irs=8"}),
            ("vacc", "", {"vacc=9"}),
            ("iptp", "", {"iptp=10"}),
            ("lsm", "", {"lsm=11"}),
        ]
        for code, name, expected in cases:
            with self.subTest(code=code, name=name):
                intervention = MockIntervention(code=code, name=name)
                result = self.provider._map_intervention(intervention)
                self.assertEqual(result, expected)

    def test_unknown_code_raises(self):
        intervention = MockIntervention(code="unknown_intervention")
        with self.assertRaises(ValueError) as ctx:
            self.provider._map_intervention(intervention)
        self.assertIn("unknown_intervention", str(ctx.exception))
        self.assertIn("IDM does not support", str(ctx.exception))

    def test_none_intervention_raises(self):
        with self.assertRaises(ValueError) as ctx:
            self.provider._map_intervention(None)
        self.assertIn("cannot be None", str(ctx.exception))

    def test_empty_code_raises(self):
        intervention = MockIntervention(code="", name="Some intervention")
        with self.assertRaises(ValueError) as ctx:
            self.provider._map_intervention(intervention)
        self.assertIn("no code", str(ctx.exception))


class IDMImpactProviderBuildFiltersTests(TestCase):
    def setUp(self):
        self.provider = IDMImpactProvider()

    def test_no_interventions_all_baseline(self):
        filters = self.provider._build_query_filters(set())
        for col in ["cm", "cm_subsidy", "smc", "itn_c", "itn_r", "irs", "vacc", "iptp", "lsm"]:
            self.assertEqual(filters[col], IDM_NONE_PACKAGE_ID, f"{col} should be baseline (1)")

    def test_single_intervention_deployed(self):
        filters = self.provider._build_query_filters({"cm=2"})
        self.assertEqual(filters["cm"], 2)
        self.assertEqual(filters["smc"], IDM_NONE_PACKAGE_ID)
        self.assertEqual(filters["itn_c"], IDM_NONE_PACKAGE_ID)

    def test_multiple_interventions(self):
        filters = self.provider._build_query_filters({"cm=2", "smc=4", "vacc=9"})
        self.assertEqual(filters["cm"], 2)
        self.assertEqual(filters["smc"], 4)
        self.assertEqual(filters["vacc"], 9)
        self.assertEqual(filters["irs"], IDM_NONE_PACKAGE_ID)
        self.assertEqual(filters["itn_c"], IDM_NONE_PACKAGE_ID)
        self.assertEqual(filters["lsm"], IDM_NONE_PACKAGE_ID)

    def test_pmc_overrides_smc_column(self):
        """PMC (id=5) and SMC (id=4) both use the smc column; last write wins."""
        filters = self.provider._build_query_filters({"smc=5"})
        self.assertEqual(filters["smc"], 5)


# ---------------------------------------------------------------------------
# Helpers for database integration tests
# ---------------------------------------------------------------------------

_IDM_MODELS = [IDMAdminInfo, IDMAgeGroup, IDMModelOutput]


def _baseline_interventions():
    """Build all IDMModelOutput intervention fields with no interventions deployed
    and return them as kwargs for IDMModelOutput.objects.create().

    Every intervention field (cm, smc, itn_c, ...) is set to IDM_NONE_PACKAGE_ID
    and every coverage field (cm_coverage, smc_coverage, ...) to None.
    """
    fields = {}
    for col in IDM_ALL_INTERVENTION_COLUMNS:
        fields[col] = IDM_NONE_PACKAGE_ID
        fields[f"{col}_coverage"] = None
    return fields


def _deploy_interventions(interventions: list[str]) -> dict:
    """Build all IDMModelOutput intervention fields with the given interventions
    deployed and return them as kwargs for IDMModelOutput.objects.create().

    Starts from baseline (all fields = none) then for each identifier
    (e.g. "cm", "smc", "pmc") sets its intervention field to the matching
    package ID and its coverage field to IDM_DEPLOYED_COVERAGE_ID.
    """
    fields = _baseline_interventions()
    for intervention in interventions:
        col, pkg_id = IDM_INTERVENTIONS[intervention]
        fields[col] = pkg_id
        fields[f"{col}_coverage"] = IDM_DEPLOYED_COVERAGE_ID
    return fields


class IDMImpactProviderDatabaseTests(TestCase):
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
            **_deploy_interventions(["cm"]),
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
            **_deploy_interventions(["cm"]),
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
            **_deploy_interventions(["cm", "smc"]),
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
            **_deploy_interventions(["cm", "smc"]),
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
            **_deploy_interventions(["cm"]),
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
            **_deploy_interventions(["cm"]),
        )

    def tearDown(self):
        self._alias_patcher.stop()

    # -- Tests --

    def test_match_with_single_intervention(self):
        """CM deployed: returns matching rows for two districts across years."""
        ou_kano = MockOrgUnit(id=101, name="Kano Municipal")
        ou_aboh = MockOrgUnit(id=103, name="Aboh Mbaise")
        cm = MockIntervention(code="cm_public")

        results = self.provider.match_impact_bulk(
            [ou_kano, ou_aboh],
            interventions=[cm],
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
        ou_kano = MockOrgUnit(id=101, name="Kano Municipal")
        ou_ikeja = MockOrgUnit(id=102, name="Ikeja")
        cm = MockIntervention(code="cm_public")
        smc = MockIntervention(code="smc")

        results = self.provider.match_impact_bulk(
            [ou_kano, ou_ikeja],
            interventions=[cm, smc],
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
        ou_kano = MockOrgUnit(id=101, name="Kano Municipal")
        cm = MockIntervention(code="cm_public")

        results = self.provider.match_impact_bulk(
            [ou_kano],
            interventions=[cm],
            age_group="allAges",
            year_from=2025,
            year_to=2025,
        )

        # Should get the CM-only row (incidence 150.5), not the CM+SMC row (120.3)
        self.assertEqual(len(results[101]), 1)
        self.assertAlmostEqual(results[101][0].number_cases.value, 75_250.0, places=1)

    def test_match_impact_delegates_to_bulk(self):
        ou_kano = MockOrgUnit(id=101, name="Kano Municipal")
        cm = MockIntervention(code="cm_public")

        results = self.provider.match_impact(
            ou_kano,
            interventions=[cm],
            age_group="allAges",
        )

        self.assertEqual(len(results), 2)
        self.assertEqual(results[0].year, 2025)
        self.assertEqual(results[1].year, 2026)

    def test_filters_by_year_range(self):
        ou_kano = MockOrgUnit(id=101, name="Kano Municipal")
        cm = MockIntervention(code="cm_public")

        results = self.provider.match_impact_bulk(
            [ou_kano],
            interventions=[cm],
            age_group="allAges",
            year_from=2026,
            year_to=2026,
        )

        self.assertEqual(len(results[101]), 1)
        self.assertEqual(results[101][0].year, 2026)

    def test_filters_by_age_group(self):
        """under5 age group only returns the under5 row, not the allAges rows."""
        ou_kano = MockOrgUnit(id=101, name="Kano Municipal")
        cm = MockIntervention(code="cm_public")

        results = self.provider.match_impact_bulk(
            [ou_kano],
            interventions=[cm],
            age_group="under5",
        )

        self.assertEqual(len(results[101]), 1)
        # 95.0 * 500_000 / 1000 = 47_500
        self.assertAlmostEqual(results[101][0].number_cases.value, 47_500.0, places=1)

    def test_name_mapping(self):
        """Iaso name 'Aboh Mbaise' resolves to IDM 'Aboh-Mbaise'."""
        ou_aboh = MockOrgUnit(id=103, name="Aboh Mbaise")
        cm = MockIntervention(code="cm_public")

        results = self.provider.match_impact_bulk(
            [ou_aboh],
            interventions=[cm],
            age_group="allAges",
        )

        self.assertIn(103, results)
        self.assertEqual(len(results[103]), 1)
        self.assertEqual(results[103][0].year, 2025)

    def test_no_match_returns_empty(self):
        ou_unknown = MockOrgUnit(id=999, name="Nonexistent District")
        cm = MockIntervention(code="cm_public")

        results = self.provider.match_impact_bulk(
            [ou_unknown],
            interventions=[cm],
            age_group="allAges",
        )

        self.assertEqual(results, {})

    def test_unknown_age_group_returns_empty(self):
        ou_kano = MockOrgUnit(id=101, name="Kano Municipal")
        cm = MockIntervention(code="cm_public")

        results = self.provider.match_impact_bulk(
            [ou_kano],
            interventions=[cm],
            age_group="nonexistent",
        )

        self.assertEqual(results, {})

    def test_duplicate_year_raises(self):
        """Conflicting rows for the same (admin, year, intervention combo) raise ValueError."""
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
            **_deploy_interventions(["cm"]),
        )

        ou_kano = MockOrgUnit(id=101, name="Kano Municipal")
        cm = MockIntervention(code="cm_public")
        with self.assertRaises(ValueError) as ctx:
            self.provider.match_impact_bulk(
                [ou_kano],
                interventions=[cm],
                age_group="allAges",
            )
        self.assertIn("conflicting rows", str(ctx.exception))

    def test_get_year_range(self):
        min_year, max_year = self.provider.get_year_range()
        self.assertEqual(min_year, 2025)
        self.assertEqual(max_year, 2026)

    def test_get_age_groups(self):
        age_groups = self.provider.get_age_groups()
        self.assertEqual(age_groups, ["allAges", "under5"])
