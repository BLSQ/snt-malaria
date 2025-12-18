from snt_malaria_budgeting import DEFAULT_COST_ASSUMPTIONS

from iaso.models.base import Account
from iaso.test import TestCase
from plugins.snt_malaria.api.budget.utils import build_budget_assumptions
from plugins.snt_malaria.models.budget_assumptions import BudgetAssumptions
from plugins.snt_malaria.models.scenario import Scenario


class BudgetUtilsTestCase(TestCase):
    def setUp(cls):
        # Create a user and account for testing
        cls.account = Account.objects.create(name="Test Account")
        cls.user = cls.create_user_with_profile(username="testuser", account=cls.account)

        # Create a scenario
        cls.scenario = Scenario.objects.create(
            account=cls.account,
            created_by=cls.user,
            name="Test Scenario",
            description="A test scenario description.",
            start_year=2025,
            end_year=2028,
        )

    def test_build_budget_assumptions_map_defaults(self):
        assumptions_map = build_budget_assumptions(self.scenario)

        # Check that the assumptions map contains default values for known interventions
        expected_defaults = DEFAULT_COST_ASSUMPTIONS
        for key, expected_value in expected_defaults.items():
            self.assertIn(key, assumptions_map)
            self.assertEqual(assumptions_map[key], expected_value)

    def test_build_budget_assumptions_map_with_existing_iptp_edge_case(self):
        BudgetAssumptions.objects.create(
            scenario=self.scenario,
            intervention_code="iptp",
            coverage=0.95,
            divisor=0,
            bale_size=0,
            buffer_mult=1.2,
            doses_per_pw=5,
            age_string="",
            pop_prop_3_11=0.0,
            pop_prop_12_59=0.0,
            monthly_rounds=0,
            touchpoints=0,
            tablet_factor=0.0,
            doses_per_child=0,
        )

        assumptions_map = build_budget_assumptions(self.scenario)
        # Check that the overridden values are present
        self.assertEqual(assumptions_map["iptp_anc_coverage"], 0.95)
        self.assertEqual(assumptions_map["iptp_doses_per_pw"], 5)
        self.assertEqual(assumptions_map["iptp_buffer_mult"], 1.2)
        # Check that other default values are still present
        self.assertEqual(assumptions_map["itn_campaign_coverage"], 1.0)
        self.assertEqual(assumptions_map["itn_campaign_divisor"], 1.8)
        self.assertEqual(assumptions_map["itn_campaign_bale_size"], 50)
        self.assertEqual(assumptions_map["itn_campaign_buffer_mult"], 1.1)
        self.assertEqual(assumptions_map["itn_routine_coverage"], 0.3)
        self.assertEqual(assumptions_map["itn_routine_buffer_mult"], 1.1)
        self.assertEqual(assumptions_map["smc_age_string"], "0.18,0.77")
        self.assertEqual(assumptions_map["smc_pop_prop_3_11"], 0.18)
        self.assertEqual(assumptions_map["smc_pop_prop_12_59"], 0.77)
        self.assertEqual(assumptions_map["smc_coverage"], 1.0)
        self.assertEqual(assumptions_map["smc_monthly_rounds"], 4)
        self.assertEqual(assumptions_map["smc_buffer_mult"], 1.1)
        self.assertEqual(assumptions_map["pmc_coverage"], 0.85)
        self.assertEqual(assumptions_map["pmc_touchpoints"], 4)
        self.assertEqual(assumptions_map["pmc_tablet_factor"], 0.75)
        self.assertEqual(assumptions_map["pmc_buffer_mult"], 1.1)
        self.assertEqual(assumptions_map["vacc_coverage"], 0.84)
        self.assertEqual(assumptions_map["vacc_buffer_mult"], 1.1)
        self.assertEqual(assumptions_map["vacc_doses_per_child"], 4)

    def test_build_budget_assumptions_map_with_existing(self):
        BudgetAssumptions.objects.create(
            scenario=self.scenario,
            intervention_code="itn_campaign",
            coverage=0.95,
            divisor=2.0,
            bale_size=60,
            buffer_mult=1.2,
            doses_per_pw=0,
            age_string="",
            pop_prop_3_11=0.0,
            pop_prop_12_59=0.0,
            monthly_rounds=0,
            touchpoints=0,
            tablet_factor=0.0,
            doses_per_child=0,
        )

        assumptions_map = build_budget_assumptions(self.scenario)
        # Check that the overridden values are present
        self.assertEqual(assumptions_map["itn_campaign_coverage"], 0.95)
        self.assertEqual(assumptions_map["itn_campaign_divisor"], 2.0)
        self.assertEqual(assumptions_map["itn_campaign_bale_size"], 60)
        self.assertEqual(assumptions_map["itn_campaign_buffer_mult"], 1.2)
        # Check that other default values are still present
        self.assertEqual(assumptions_map["itn_routine_coverage"], 0.3)
        self.assertEqual(assumptions_map["itn_routine_buffer_mult"], 1.1)
        self.assertEqual(assumptions_map["iptp_anc_coverage"], 0.8)
        self.assertEqual(assumptions_map["iptp_doses_per_pw"], 3)
        self.assertEqual(assumptions_map["iptp_buffer_mult"], 1.1)
        self.assertEqual(assumptions_map["smc_age_string"], "0.18,0.77")
        self.assertEqual(assumptions_map["smc_pop_prop_3_11"], 0.18)
        self.assertEqual(assumptions_map["smc_pop_prop_12_59"], 0.77)
        self.assertEqual(assumptions_map["smc_coverage"], 1.0)
        self.assertEqual(assumptions_map["smc_monthly_rounds"], 4)
        self.assertEqual(assumptions_map["smc_buffer_mult"], 1.1)
        self.assertEqual(assumptions_map["pmc_coverage"], 0.85)
        self.assertEqual(assumptions_map["pmc_touchpoints"], 4)
        self.assertEqual(assumptions_map["pmc_tablet_factor"], 0.75)
        self.assertEqual(assumptions_map["pmc_buffer_mult"], 1.1)
        self.assertEqual(assumptions_map["vacc_coverage"], 0.84)
        self.assertEqual(assumptions_map["vacc_buffer_mult"], 1.1)
        self.assertEqual(assumptions_map["vacc_doses_per_child"], 4)
