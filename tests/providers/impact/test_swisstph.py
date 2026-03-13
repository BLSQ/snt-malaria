from unittest.mock import patch

from django.db import connection
from django.test import TestCase

from plugins.snt_malaria.models.swisstph_impact import SwissTPHImpactData
from plugins.snt_malaria.providers.impact.base import InterventionMappingError, OrgUnitMappingError
from plugins.snt_malaria.providers.impact.swisstph import (
    KNOWN_DEPLOYED_COLUMNS,
    SwissTPHImpactProvider,
)


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
        self.provider = SwissTPHImpactProvider()

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
        self.provider = SwissTPHImpactProvider()

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
# Database-backed integration tests for source_ref org unit matching
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


class SwissTPHSourceRefIntegrationTests(TestCase):
    """Integration tests verifying that match_impact_bulk uses source_ref for
    org unit matching, falling back to name when source_ref is not set.

    SwissTPHImpactData is unmanaged; we create the table in the default test
    database and patch SWISSTPH_DATABASE_ALIAS to 'default'.
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
        self._alias_patcher = patch(
            "plugins.snt_malaria.providers.impact.swisstph.SWISSTPH_DATABASE_ALIAS",
            "default",
        )
        self._alias_patcher.start()
        self.provider = SwissTPHImpactProvider()

        SwissTPHImpactData.objects.using("default").create(
            impact_index=1,
            admin_1="Bern",
            year=2025,
            seed=1,
            age_group="allAges",
            n_uncomp=100.0,
            n_severe=10.0,
            prevalence_rate=0.05,
            n_host=50000.0,
            expected_direct_deaths=1.0,
            **_deploy_fields({"deployed_int_smc"}),
        )
        SwissTPHImpactData.objects.using("default").create(
            impact_index=2,
            admin_1="Bern",
            year=2025,
            seed=2,
            age_group="allAges",
            n_uncomp=110.0,
            n_severe=12.0,
            prevalence_rate=0.06,
            n_host=50000.0,
            expected_direct_deaths=1.5,
            **_deploy_fields({"deployed_int_smc"}),
        )

    def tearDown(self):
        self._alias_patcher.stop()

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
