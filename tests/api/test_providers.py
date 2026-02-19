from unittest.mock import MagicMock, patch

from django.test import TestCase

from iaso.models.base import Account
from plugins.snt_malaria.models.impact_provider_config import ImpactProviderConfig
from plugins.snt_malaria.providers.impact.base import ImpactProvider
from plugins.snt_malaria.providers.impact.idm import IDM_INTERVENTION_MAP, IDM_NONE_PACKAGE_ID, IDMImpactProvider
from plugins.snt_malaria.providers.impact.registry import get_provider_for_account
from plugins.snt_malaria.providers.impact.swisstph import (
    INTERVENTION_COLUMN_MAP,
    KNOWN_DEPLOYED_COLUMNS,
    SwissTPHImpactProvider,
)


class MockIntervention:
    """Minimal mock for Intervention model instances."""

    def __init__(self, code, name=""):
        self.code = code
        self.name = name


# ---------------------------------------------------------------------------
# SwissTPHImpactProvider tests
# ---------------------------------------------------------------------------


class SwissTPHImpactProviderMapInterventionTests(TestCase):
    def setUp(self):
        self.provider = SwissTPHImpactProvider()

    def test_cm_public_maps_to_iccm(self):
        intervention = MockIntervention(code="cm_public")
        result = self.provider._map_intervention(intervention)
        self.assertEqual(result, {"deployed_int_iCCM"})

    def test_iptp_maps_to_iptsc(self):
        intervention = MockIntervention(code="iptp")
        result = self.provider._map_intervention(intervention)
        self.assertEqual(result, {"deployed_int_IPTSc"})

    def test_smc_maps_to_smc(self):
        intervention = MockIntervention(code="smc")
        result = self.provider._map_intervention(intervention)
        self.assertEqual(result, {"deployed_int_SMC"})

    def test_pmc_maps_to_pmc(self):
        intervention = MockIntervention(code="pmc")
        result = self.provider._map_intervention(intervention)
        self.assertEqual(result, {"deployed_int_PMC"})

    def test_vacc_maps_to_vaccine(self):
        intervention = MockIntervention(code="vacc")
        result = self.provider._map_intervention(intervention)
        self.assertEqual(result, {"deployed_int_Vaccine"})

    def test_irs_maps_to_irs(self):
        intervention = MockIntervention(code="irs")
        result = self.provider._map_intervention(intervention)
        self.assertEqual(result, {"deployed_int_IRS"})

    def test_itn_campaign_standard_maps_to_itn(self):
        intervention = MockIntervention(code="itn_campaign", name="Standard Pyrethroid")
        result = self.provider._map_intervention(intervention)
        self.assertEqual(result, {"deployed_int_ITN"})

    def test_itn_campaign_pbo_by_code(self):
        intervention = MockIntervention(code="itn_campaign_pbo")
        result = self.provider._map_intervention(intervention)
        self.assertEqual(result, {"deployed_int_PBO"})

    def test_itn_campaign_ig2_by_code(self):
        intervention = MockIntervention(code="itn_campaign_ig2")
        result = self.provider._map_intervention(intervention)
        self.assertEqual(result, {"deployed_int_IG2"})

    def test_itn_campaign_pbo_by_name(self):
        intervention = MockIntervention(code="itn_campaign", name="PBO")
        result = self.provider._map_intervention(intervention)
        self.assertEqual(result, {"deployed_int_PBO"})

    def test_itn_campaign_ig2_by_name(self):
        intervention = MockIntervention(code="itn_campaign", name="Dual AI")
        result = self.provider._map_intervention(intervention)
        self.assertEqual(result, {"deployed_int_IG2"})

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
        filters = self.provider._build_query_filters({"deployed_int_SMC"})
        self.assertTrue(filters["deployed_int_SMC"])
        self.assertFalse(filters["deployed_int_IRS"])
        # ITN should be False since no net interventions
        self.assertFalse(filters["deployed_int_ITN"])

    def test_itn_pbo_sets_itn_true(self):
        """When PBO is deployed, deployed_int_ITN should also be True."""
        filters = self.provider._build_query_filters({"deployed_int_PBO"})
        self.assertTrue(filters["deployed_int_ITN"])
        # PBO itself is not in KNOWN_DEPLOYED_COLUMNS as a direct filter target
        # but it IS in the set, so it should be True
        self.assertTrue(filters["deployed_int_PBO"])

    def test_multiple_interventions(self):
        deployed = {"deployed_int_SMC", "deployed_int_IRS", "deployed_int_Vaccine"}
        filters = self.provider._build_query_filters(deployed)
        self.assertTrue(filters["deployed_int_SMC"])
        self.assertTrue(filters["deployed_int_IRS"])
        self.assertTrue(filters["deployed_int_Vaccine"])
        self.assertFalse(filters["deployed_int_iCCM"])
        self.assertFalse(filters["deployed_int_ITN"])


# ---------------------------------------------------------------------------
# IDMImpactProvider tests
# ---------------------------------------------------------------------------


class IDMImpactProviderMapInterventionTests(TestCase):
    def setUp(self):
        self.provider = IDMImpactProvider()

    def test_cm_public_maps_to_cm_2(self):
        intervention = MockIntervention(code="cm_public")
        result = self.provider._map_intervention(intervention)
        self.assertEqual(result, {"cm=2"})

    def test_cm_subsidy_maps_to_cm_subsidy_3(self):
        intervention = MockIntervention(code="cm_subsidy")
        result = self.provider._map_intervention(intervention)
        self.assertEqual(result, {"cm_subsidy=3"})

    def test_smc_maps_to_smc_4(self):
        intervention = MockIntervention(code="smc")
        result = self.provider._map_intervention(intervention)
        self.assertEqual(result, {"smc=4"})

    def test_pmc_shares_smc_column_with_id_5(self):
        intervention = MockIntervention(code="pmc")
        result = self.provider._map_intervention(intervention)
        self.assertEqual(result, {"smc=5"})

    def test_itn_campaign_maps_to_itn_c_6(self):
        intervention = MockIntervention(code="itn_campaign")
        result = self.provider._map_intervention(intervention)
        self.assertEqual(result, {"itn_c=6"})

    def test_itn_campaign_pbo_by_name_maps_to_itn_c_6(self):
        """PBO variant identified by name still maps to itn_c in IDM."""
        intervention = MockIntervention(code="itn_campaign", name="PBO")
        result = self.provider._map_intervention(intervention)
        self.assertEqual(result, {"itn_c=6"})

    def test_itn_campaign_ig2_by_name_maps_to_itn_c_6(self):
        """IG2/Dual AI variant identified by name still maps to itn_c in IDM."""
        intervention = MockIntervention(code="itn_campaign", name="Dual AI")
        result = self.provider._map_intervention(intervention)
        self.assertEqual(result, {"itn_c=6"})

    def test_itn_routine_maps_to_itn_r_7(self):
        intervention = MockIntervention(code="itn_routine")
        result = self.provider._map_intervention(intervention)
        self.assertEqual(result, {"itn_r=7"})

    def test_irs_maps_to_irs_8(self):
        intervention = MockIntervention(code="irs")
        result = self.provider._map_intervention(intervention)
        self.assertEqual(result, {"irs=8"})

    def test_vacc_maps_to_vacc_9(self):
        intervention = MockIntervention(code="vacc")
        result = self.provider._map_intervention(intervention)
        self.assertEqual(result, {"vacc=9"})

    def test_iptp_maps_to_iptp_10(self):
        intervention = MockIntervention(code="iptp")
        result = self.provider._map_intervention(intervention)
        self.assertEqual(result, {"iptp=10"})

    def test_lsm_maps_to_lsm_11(self):
        intervention = MockIntervention(code="lsm")
        result = self.provider._map_intervention(intervention)
        self.assertEqual(result, {"lsm=11"})

    def test_unknown_code_returns_empty(self):
        intervention = MockIntervention(code="unknown_intervention")
        result = self.provider._map_intervention(intervention)
        self.assertEqual(result, set())


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
        # All others should be baseline
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
        # If both are in the set, the last one parsed wins (set is unordered)
        # In practice, only one would be deployed per org unit
        filters = self.provider._build_query_filters({"smc=5"})
        self.assertEqual(filters["smc"], 5)


# ---------------------------------------------------------------------------
# Provider Registry tests
# ---------------------------------------------------------------------------


class ProviderRegistryTests(TestCase):
    def setUp(self):
        self.account = Account.objects.create(name="Test Provider Account")

    def test_no_config_returns_none(self):
        """When no ImpactProviderConfig exists, return None."""
        provider = get_provider_for_account(self.account)
        self.assertIsNone(provider)

    def test_swisstph_config_returns_swisstph(self):
        ImpactProviderConfig.objects.create(account=self.account, provider_key="swisstph")
        provider = get_provider_for_account(self.account)
        self.assertIsInstance(provider, SwissTPHImpactProvider)

    def test_idm_config_returns_idm(self):
        ImpactProviderConfig.objects.create(account=self.account, provider_key="idm")
        provider = get_provider_for_account(self.account)
        self.assertIsInstance(provider, IDMImpactProvider)
