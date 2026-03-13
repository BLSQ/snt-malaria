from django.test import TestCase

from plugins.snt_malaria.providers.impact.base import InterventionMappingError
from plugins.snt_malaria.providers.impact.swisstph import (
    KNOWN_DEPLOYED_COLUMNS,
    SwissTPHImpactProvider,
)


class MockIntervention:
    """Minimal mock for Intervention model instances used in SwissTPH tests."""

    def __init__(self, impact_ref=""):
        self.impact_ref = impact_ref


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
