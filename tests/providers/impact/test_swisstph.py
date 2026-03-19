from unittest.mock import patch

from django.db import connection
from django.test import TestCase

from plugins.snt_malaria.models.swisstph_impact import SwissTPHImpactData
from plugins.snt_malaria.providers.impact.base import InterventionMappingError, OrgUnitMappingError
from plugins.snt_malaria.providers.impact.swisstph import (
    KNOWN_DEPLOYED_COLUMNS,
    SwissTPHImpactProvider,
)


_PROVIDER_KWARGS = {"config_id": 0, "config": {}, "secret": ""}
_CMR_CONFIG = {
    "admin_field": "admin_2",
    "eir_ci_mean": "middle",
    "eir_ci_lower": "low",
    "eir_ci_upper": "high",
}
_CMR_PROVIDER_KWARGS = {"config_id": 0, "config": _CMR_CONFIG, "secret": ""}


class MockIntervention:
    """Minimal mock for Intervention model instances used in SwissTPH tests."""

    def __init__(self, impact_ref=""):
        self.impact_ref = impact_ref


class MockOrgUnit:
    """Minimal mock for OrgUnit model instances."""

    def __init__(self, id, name, source_ref=None):
        self.id = id
        self.name = name
        self.source_ref = source_ref


class SwissTPHMapInterventionTests(TestCase):
    def setUp(self):
        with patch("plugins.snt_malaria.providers.impact.swisstph.ensure_db_connection", return_value="default"):
            self.provider = SwissTPHImpactProvider(**_PROVIDER_KWARGS)

    def test_valid_impact_ref_returns_matching_column(self):
        """Each known deployed_int_* column name should be accepted as a valid impact_ref."""
        test_cases = [
            ("deployed_int_iccm", {"deployed_int_iccm"}),
            ("deployed_int_iptsc", {"deployed_int_iptsc"}),
            ("deployed_int_smc", {"deployed_int_smc"}),
            ("deployed_int_pmc", {"deployed_int_pmc"}),
            ("deployed_int_vaccine", {"deployed_int_vaccine"}),
            ("deployed_int_irs", {"deployed_int_irs"}),
            ("deployed_int_itn", {"deployed_int_itn"}),
            ("deployed_int_pbo", {"deployed_int_pbo"}),
            ("deployed_int_ig2", {"deployed_int_ig2"}),
        ]
        for impact_ref, expected_columns in test_cases:
            with self.subTest(impact_ref=impact_ref):
                intervention = MockIntervention(impact_ref=impact_ref)
                result = self.provider._map_intervention(intervention)
                self.assertEqual(result, expected_columns)

    def test_empty_impact_ref_raises_mapping_error(self):
        intervention = MockIntervention(impact_ref="")
        with self.assertRaises(InterventionMappingError) as context:
            self.provider._map_intervention(intervention)
        self.assertIn("no impact_ref", str(context.exception))

    def test_unrecognised_impact_ref_raises_mapping_error(self):
        intervention = MockIntervention(impact_ref="unknown_column")
        with self.assertRaises(InterventionMappingError) as context:
            self.provider._map_intervention(intervention)
        self.assertIn("Unknown SwissTPH column", str(context.exception))

    def test_whitespace_is_stripped_from_impact_ref(self):
        intervention = MockIntervention(impact_ref="  deployed_int_smc  ")
        result = self.provider._map_intervention(intervention)
        self.assertEqual(result, {"deployed_int_smc"})

    def test_comma_separated_impact_ref_returns_multiple_columns(self):
        """A comma-separated impact_ref should activate all listed columns."""
        intervention = MockIntervention(impact_ref="deployed_int_pbo,deployed_int_itn")
        result = self.provider._map_intervention(intervention)
        self.assertEqual(result, {"deployed_int_pbo", "deployed_int_itn"})

    def test_comma_separated_with_whitespace(self):
        intervention = MockIntervention(impact_ref=" deployed_int_pbo , deployed_int_itn ")
        result = self.provider._map_intervention(intervention)
        self.assertEqual(result, {"deployed_int_pbo", "deployed_int_itn"})

    def test_comma_separated_with_unrecognised_entry_raises_mapping_error(self):
        intervention = MockIntervention(impact_ref="deployed_int_smc,unknown_column")
        with self.assertRaises(InterventionMappingError) as context:
            self.provider._map_intervention(intervention)
        self.assertIn("Unknown SwissTPH column", str(context.exception))
        self.assertIn("unknown_column", str(context.exception))


class SwissTPHBuildQueryFiltersTests(TestCase):
    def setUp(self):
        with patch("plugins.snt_malaria.providers.impact.swisstph.ensure_db_connection", return_value="default"):
            self.provider = SwissTPHImpactProvider(**_PROVIDER_KWARGS)

    def test_no_deployed_columns_all_false(self):
        filters = self.provider._build_query_filters(set())
        for column in KNOWN_DEPLOYED_COLUMNS:
            self.assertFalse(filters[column])

    def test_single_deployed_column(self):
        filters = self.provider._build_query_filters({"deployed_int_smc"})
        self.assertTrue(filters["deployed_int_smc"])
        self.assertFalse(filters["deployed_int_irs"])
        self.assertFalse(filters["deployed_int_itn"])

    def test_multiple_deployed_columns(self):
        deployed = {"deployed_int_smc", "deployed_int_irs", "deployed_int_vaccine"}
        filters = self.provider._build_query_filters(deployed)
        self.assertTrue(filters["deployed_int_smc"])
        self.assertTrue(filters["deployed_int_irs"])
        self.assertTrue(filters["deployed_int_vaccine"])
        self.assertFalse(filters["deployed_int_iccm"])
        self.assertFalse(filters["deployed_int_itn"])

    def test_each_column_is_independent(self):
        """Deploying one net type (e.g. PBO) should not affect other columns."""
        filters = self.provider._build_query_filters({"deployed_int_pbo"})
        self.assertTrue(filters["deployed_int_pbo"])
        self.assertFalse(filters["deployed_int_itn"])
        self.assertFalse(filters["deployed_int_ig2"])


# ---------------------------------------------------------------------------
# Database-backed integration tests for match_impact_bulk
# ---------------------------------------------------------------------------

_SWISSTPH_MODELS = [SwissTPHImpactData]


def _baseline_deployed_fields():
    """Return SwissTPHImpactData kwargs with all deployed_int_* columns set to False."""
    return {col: False for col in KNOWN_DEPLOYED_COLUMNS}


def _deploy_fields(deployed_columns: set[str]) -> dict:
    """Return deployed_int_* kwargs with the given columns set to True."""
    fields = _baseline_deployed_fields()
    for col in deployed_columns:
        fields[col] = True
    return fields


class SwissTPHMatchImpactBulkTests(TestCase):
    """Integration tests for match_impact_bulk: org unit matching, EIR_CI-based
    confidence intervals, and edge cases.

    SwissTPHImpactData is unmanaged; we create the table in the default test
    database and patch ensure_db_connection to return 'default'.
    """

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        with connection.schema_editor() as schema_editor:
            for model in _SWISSTPH_MODELS:
                model._meta.managed = True
                schema_editor.create_model(model)

    @classmethod
    def tearDownClass(cls):
        with connection.schema_editor() as schema_editor:
            for model in reversed(_SWISSTPH_MODELS):
                schema_editor.delete_model(model)
        for model in _SWISSTPH_MODELS:
            model._meta.managed = False
        super().tearDownClass()

    def setUp(self):
        with patch(
            "plugins.snt_malaria.providers.impact.swisstph.ensure_db_connection",
            return_value="default",
        ):
            self.provider = SwissTPHImpactProvider(**_PROVIDER_KWARGS)

        deploy = _deploy_fields({"deployed_int_smc"})
        base = dict(admin_1="Bern", year=2025, age_group="allAges", n_host=50000.0, **deploy)

        # Seed 1 — three EIR_CI categories
        SwissTPHImpactData.objects.using("default").create(
            impact_index=1,
            seed=1,
            eir_ci="EIR_mean",
            n_uncomp=100.0,
            n_severe=10.0,
            prevalence_rate=0.05,
            expected_direct_deaths=1.0,
            **base,
        )
        SwissTPHImpactData.objects.using("default").create(
            impact_index=2,
            seed=1,
            eir_ci="EIR_lci",
            n_uncomp=80.0,
            n_severe=8.0,
            prevalence_rate=0.04,
            expected_direct_deaths=0.8,
            **base,
        )
        SwissTPHImpactData.objects.using("default").create(
            impact_index=3,
            seed=1,
            eir_ci="EIR_uci",
            n_uncomp=120.0,
            n_severe=12.0,
            prevalence_rate=0.06,
            expected_direct_deaths=1.2,
            **base,
        )
        # Seed 2 — three EIR_CI categories
        SwissTPHImpactData.objects.using("default").create(
            impact_index=4,
            seed=2,
            eir_ci="EIR_mean",
            n_uncomp=110.0,
            n_severe=12.0,
            prevalence_rate=0.06,
            expected_direct_deaths=1.5,
            **base,
        )
        SwissTPHImpactData.objects.using("default").create(
            impact_index=5,
            seed=2,
            eir_ci="EIR_lci",
            n_uncomp=90.0,
            n_severe=9.0,
            prevalence_rate=0.045,
            expected_direct_deaths=1.0,
            **base,
        )
        SwissTPHImpactData.objects.using("default").create(
            impact_index=6,
            seed=2,
            eir_ci="EIR_uci",
            n_uncomp=130.0,
            n_severe=14.0,
            prevalence_rate=0.07,
            expected_direct_deaths=2.0,
            **base,
        )

    def test_source_ref_used_for_matching(self):
        """When source_ref is set, it is used to match against admin_1."""
        org_unit = MockOrgUnit(id=1, name="Different Name", source_ref="Bern")
        intervention = MockIntervention(impact_ref="deployed_int_smc")

        results = self.provider.match_impact_bulk(
            [org_unit],
            interventions=[intervention],
            age_group="allAges",
        )

        self.assertIn(1, results)
        self.assertEqual(len(results[1]), 1)
        self.assertEqual(results[1][0].year, 2025)

    def test_name_fallback_when_no_source_ref(self):
        """When source_ref is not set, the org unit name is used."""
        org_unit = MockOrgUnit(id=1, name="Bern")
        intervention = MockIntervention(impact_ref="deployed_int_smc")

        results = self.provider.match_impact_bulk(
            [org_unit],
            interventions=[intervention],
            age_group="allAges",
        )

        self.assertIn(1, results)
        self.assertEqual(len(results[1]), 1)

    def test_wrong_source_ref_raises_org_unit_mapping_error(self):
        """A source_ref that doesn't exist in the impact DB should raise OrgUnitMappingError."""
        org_unit = MockOrgUnit(id=1, name="Bern", source_ref="Zurich")
        intervention = MockIntervention(impact_ref="deployed_int_smc")

        with self.assertRaises(OrgUnitMappingError) as context:
            self.provider.match_impact_bulk(
                [org_unit],
                interventions=[intervention],
                age_group="allAges",
            )
        self.assertIn("Zurich", str(context.exception))

    def test_nonexistent_org_unit_raises_org_unit_mapping_error(self):
        """An org unit whose name doesn't exist in the impact DB should raise OrgUnitMappingError."""
        org_unit = MockOrgUnit(id=1, name="Nonexistent Canton")
        intervention = MockIntervention(impact_ref="deployed_int_smc")

        with self.assertRaises(OrgUnitMappingError) as context:
            self.provider.match_impact_bulk(
                [org_unit],
                interventions=[intervention],
                age_group="allAges",
            )
        self.assertIn("Nonexistent Canton", str(context.exception))

    def test_no_error_when_org_unit_exists_but_intervention_mix_unmatched(self):
        """An org unit that exists but has no data for the queried interventions returns empty."""
        org_unit = MockOrgUnit(id=1, name="Bern")
        intervention = MockIntervention(impact_ref="deployed_int_irs")

        results = self.provider.match_impact_bulk(
            [org_unit],
            interventions=[intervention],
            age_group="allAges",
        )

        self.assertEqual(results, {})

    def test_ci_values_derived_from_eir_ci_column(self):
        """value/lower/upper come from averaging EIR_mean/EIR_lci/EIR_uci rows over seeds."""
        org_unit = MockOrgUnit(id=1, name="Bern")
        intervention = MockIntervention(impact_ref="deployed_int_smc")

        results = self.provider.match_impact_bulk(
            [org_unit],
            interventions=[intervention],
            age_group="allAges",
        )

        self.assertEqual(len(results[1]), 1)
        result = results[1][0]

        # value = avg of EIR_mean seeds: (100+110)/2, (10+12)/2, ...
        self.assertAlmostEqual(result.number_cases.value, 105.0)
        self.assertAlmostEqual(result.number_severe_cases.value, 11.0)
        self.assertAlmostEqual(result.prevalence_rate.value, 0.055)
        self.assertAlmostEqual(result.direct_deaths.value, 1.25)

        # lower = avg of EIR_lci seeds: (80+90)/2, (8+9)/2, ...
        self.assertAlmostEqual(result.number_cases.lower, 85.0)
        self.assertAlmostEqual(result.number_severe_cases.lower, 8.5)
        self.assertAlmostEqual(result.prevalence_rate.lower, 0.0425)
        self.assertAlmostEqual(result.direct_deaths.lower, 0.9)

        # upper = avg of EIR_uci seeds: (120+130)/2, (12+14)/2, ...
        self.assertAlmostEqual(result.number_cases.upper, 125.0)
        self.assertAlmostEqual(result.number_severe_cases.upper, 13.0)
        self.assertAlmostEqual(result.prevalence_rate.upper, 0.065)
        self.assertAlmostEqual(result.direct_deaths.upper, 1.6)

        self.assertAlmostEqual(result.population, 50000.0)

    def test_duplicate_rows_are_averaged_transparently(self):
        """Identical duplicate rows (e.g. from different scenario_names) are absorbed by Avg."""
        deploy = _deploy_fields({"deployed_int_smc"})
        base = dict(admin_1="Geneva", year=2025, age_group="allAges", n_host=50000.0, **deploy)

        SwissTPHImpactData.objects.using("default").create(
            impact_index=100,
            seed=1,
            eir_ci="EIR_mean",
            scenario_name="bau",
            n_uncomp=100.0,
            n_severe=10.0,
            prevalence_rate=0.05,
            expected_direct_deaths=1.0,
            **base,
        )
        SwissTPHImpactData.objects.using("default").create(
            impact_index=101,
            seed=1,
            eir_ci="EIR_mean",
            scenario_name="nsp",
            n_uncomp=100.0,
            n_severe=10.0,
            prevalence_rate=0.05,
            expected_direct_deaths=1.0,
            **base,
        )

        org_unit = MockOrgUnit(id=1, name="Geneva")
        intervention = MockIntervention(impact_ref="deployed_int_smc")

        results = self.provider.match_impact_bulk(
            [org_unit],
            interventions=[intervention],
            age_group="allAges",
        )

        result = results[1][0]
        self.assertAlmostEqual(result.number_cases.value, 100.0)
        self.assertAlmostEqual(result.number_severe_cases.value, 10.0)

    def test_missing_eir_ci_categories_yield_none_bounds(self):
        """When only EIR_mean rows exist, lower and upper should be None."""
        deploy = _deploy_fields({"deployed_int_smc"})
        base = dict(admin_1="Geneva", year=2025, age_group="allAges", n_host=50000.0, **deploy)

        SwissTPHImpactData.objects.using("default").create(
            impact_index=200,
            seed=1,
            eir_ci="EIR_mean",
            n_uncomp=100.0,
            n_severe=10.0,
            prevalence_rate=0.05,
            expected_direct_deaths=1.0,
            **base,
        )

        org_unit = MockOrgUnit(id=1, name="Geneva")
        intervention = MockIntervention(impact_ref="deployed_int_smc")

        results = self.provider.match_impact_bulk(
            [org_unit],
            interventions=[intervention],
            age_group="allAges",
        )

        result = results[1][0]
        self.assertAlmostEqual(result.number_cases.value, 100.0)
        self.assertIsNone(result.number_cases.lower)
        self.assertIsNone(result.number_cases.upper)
        self.assertAlmostEqual(result.number_severe_cases.value, 10.0)
        self.assertIsNone(result.number_severe_cases.lower)
        self.assertIsNone(result.number_severe_cases.upper)

    def test_rows_without_eir_ci_are_excluded(self):
        """Rows with eir_ci=NULL or an unrecognised value are not included."""
        deploy = _deploy_fields({"deployed_int_smc"})
        base = dict(admin_1="Geneva", year=2025, age_group="allAges", n_host=50000.0, **deploy)

        SwissTPHImpactData.objects.using("default").create(
            impact_index=300,
            seed=1,
            eir_ci=None,
            n_uncomp=999.0,
            n_severe=999.0,
            prevalence_rate=0.99,
            expected_direct_deaths=99.0,
            **base,
        )
        SwissTPHImpactData.objects.using("default").create(
            impact_index=301,
            seed=1,
            eir_ci="EIR_mean",
            n_uncomp=100.0,
            n_severe=10.0,
            prevalence_rate=0.05,
            expected_direct_deaths=1.0,
            **base,
        )

        org_unit = MockOrgUnit(id=1, name="Geneva")
        intervention = MockIntervention(impact_ref="deployed_int_smc")

        results = self.provider.match_impact_bulk(
            [org_unit],
            interventions=[intervention],
            age_group="allAges",
        )

        result = results[1][0]
        self.assertAlmostEqual(result.number_cases.value, 100.0)
        self.assertIsNone(result.number_cases.lower)
        self.assertIsNone(result.number_cases.upper)


class SwissTPHCustomConfigTests(TestCase):
    """Tests for configurable EIR_CI values and admin_field (e.g. CMR-style config)."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        with connection.schema_editor() as schema_editor:
            for model in _SWISSTPH_MODELS:
                model._meta.managed = True
                schema_editor.create_model(model)

    @classmethod
    def tearDownClass(cls):
        with connection.schema_editor() as schema_editor:
            for model in reversed(_SWISSTPH_MODELS):
                schema_editor.delete_model(model)
        for model in _SWISSTPH_MODELS:
            model._meta.managed = False
        super().tearDownClass()

    def setUp(self):
        with patch(
            "plugins.snt_malaria.providers.impact.swisstph.ensure_db_connection",
            return_value="default",
        ):
            self.provider = SwissTPHImpactProvider(**_CMR_PROVIDER_KWARGS)

        deploy = _deploy_fields({"deployed_int_smc"})
        base = dict(admin_2="Douala", year=2025, age_group="allAges", n_host=40000.0, **deploy)

        SwissTPHImpactData.objects.using("default").create(
            impact_index=1,
            seed=1,
            eir_ci="middle",
            n_uncomp=200.0,
            n_severe=20.0,
            prevalence_rate=0.10,
            expected_direct_deaths=2.0,
            **base,
        )
        SwissTPHImpactData.objects.using("default").create(
            impact_index=2,
            seed=1,
            eir_ci="low",
            n_uncomp=160.0,
            n_severe=16.0,
            prevalence_rate=0.08,
            expected_direct_deaths=1.6,
            **base,
        )
        SwissTPHImpactData.objects.using("default").create(
            impact_index=3,
            seed=1,
            eir_ci="high",
            n_uncomp=240.0,
            n_severe=24.0,
            prevalence_rate=0.12,
            expected_direct_deaths=2.4,
            **base,
        )

    def test_custom_eir_ci_values_and_admin_field(self):
        """Provider respects eir_ci_mean/lower/upper and admin_field from config."""
        org_unit = MockOrgUnit(id=1, name="Douala")
        intervention = MockIntervention(impact_ref="deployed_int_smc")

        results = self.provider.match_impact_bulk(
            [org_unit],
            interventions=[intervention],
            age_group="allAges",
        )

        self.assertIn(1, results)
        result = results[1][0]
        self.assertAlmostEqual(result.number_cases.value, 200.0)
        self.assertAlmostEqual(result.number_cases.lower, 160.0)
        self.assertAlmostEqual(result.number_cases.upper, 240.0)
        self.assertAlmostEqual(result.population, 40000.0)

    def test_default_eir_ci_values_are_original_swisstph(self):
        """Without config overrides, the defaults match the original SwissTPH values."""
        with patch(
            "plugins.snt_malaria.providers.impact.swisstph.ensure_db_connection",
            return_value="default",
        ):
            provider = SwissTPHImpactProvider(**_PROVIDER_KWARGS)

        self.assertEqual(provider._admin_field, "admin_1")
        self.assertEqual(provider._eir_ci_mean, "EIR_mean")
        self.assertEqual(provider._eir_ci_lower, "EIR_lci")
        self.assertEqual(provider._eir_ci_upper, "EIR_uci")
