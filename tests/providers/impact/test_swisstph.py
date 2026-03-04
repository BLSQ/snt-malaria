from django.test import TestCase

from plugins.snt_malaria.providers.impact.swisstph import (
    KNOWN_DEPLOYED_COLUMNS,
    SwissTPHImpactProvider,
)


class MockIntervention:
    """Minimal mock for Intervention model instances."""

    def __init__(self, code, name=""):
        self.code = code
        self.name = name


class SwissTPHImpactProviderMapInterventionTests(TestCase):
    def setUp(self):
        self.provider = SwissTPHImpactProvider()

    def test_intervention_mapping(self):
        cases = [
            ("cm_public", "", {"deployed_int_iccm"}),
            ("iptp", "", {"deployed_int_iptsc"}),
            ("smc", "", {"deployed_int_smc"}),
            ("pmc", "", {"deployed_int_pmc"}),
            ("vacc", "", {"deployed_int_vaccine"}),
            ("irs", "", {"deployed_int_irs"}),
            ("itn_campaign", "Standard Pyrethroid", {"deployed_int_itn"}),
            ("itn_campaign_pbo", "", {"deployed_int_pbo"}),
            ("itn_campaign_ig2", "", {"deployed_int_ig2"}),
            ("itn_campaign", "PBO", {"deployed_int_pbo"}),
            ("itn_campaign", "Dual AI", {"deployed_int_ig2"}),
        ]
        for code, name, expected in cases:
            with self.subTest(code=code, name=name):
                intervention = MockIntervention(code=code, name=name)
                result = self.provider._map_intervention(intervention)
                self.assertEqual(result, expected)

    def test_unknown_code_returns_empty(self):
        intervention = MockIntervention(code="unknown_intervention")
        result = self.provider._map_intervention(intervention)
        self.assertEqual(result, set())


class SwissTPHImpactProviderBuildFiltersTests(TestCase):
    def setUp(self):
        self.provider = SwissTPHImpactProvider()

    def test_no_interventions_all_false(self):
        filters = self.provider._build_query_filters(set())
        for col in KNOWN_DEPLOYED_COLUMNS:
            self.assertFalse(filters[col])

    def test_single_intervention(self):
        filters = self.provider._build_query_filters({"deployed_int_smc"})
        self.assertTrue(filters["deployed_int_smc"])
        self.assertFalse(filters["deployed_int_irs"])
        # ITN should be False since no net interventions
        self.assertFalse(filters["deployed_int_itn"])

    def test_itn_pbo_sets_itn_true(self):
        """When PBO is deployed, deployed_int_itn should also be True."""
        filters = self.provider._build_query_filters({"deployed_int_pbo"})
        self.assertTrue(filters["deployed_int_itn"])
        self.assertTrue(filters["deployed_int_pbo"])

    def test_multiple_interventions(self):
        deployed = {"deployed_int_smc", "deployed_int_irs", "deployed_int_vaccine"}
        filters = self.provider._build_query_filters(deployed)
        self.assertTrue(filters["deployed_int_smc"])
        self.assertTrue(filters["deployed_int_irs"])
        self.assertTrue(filters["deployed_int_vaccine"])
        self.assertFalse(filters["deployed_int_iccm"])
        self.assertFalse(filters["deployed_int_itn"])
