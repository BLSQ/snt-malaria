from snt_malaria_budgeting import DEFAULT_COST_ASSUMPTIONS

from plugins.snt_malaria.api.budget.utils import build_budget_assumptions
from plugins.snt_malaria.models.budget_assumptions import BudgetAssumptions
from plugins.snt_malaria.tests.models.test_scenario import SNTMalariaTestCase


class BudgetUtilsTestCase(SNTMalariaTestCase):
    def setUp(self):
        super().setUp()

        self.account, self.user, _, _, _ = self.create_snt_account_with_project()

        # Create a scenario
        self.scenario = self.create_snt_scenario(
            account=self.account,
            created_by=self.user,
            name="Test Scenario",
            description="A test scenario description.",
            start_year=2025,
            end_year=2028,
        )

        defaults = self.create_snt_default_interventions_setup(
            scenario=self.scenario,
            account=self.account,
            created_by=self.user,
        )

        self.out_district = defaults["org_unit_type"]
        self.district1 = defaults["district_1"]
        self.district2 = defaults["district_2"]
        self.assignment1 = defaults["assignment_itn_campaign"]
        self.assignment2 = defaults["assignment_iptp"]

    @property
    def scenario_year(self):
        return self.scenario.start_year

    def test_build_budget_assumptions_map_defaults(self):
        BudgetAssumptions.objects.create(
            scenario=self.scenario,
            intervention_assignment=self.assignment1,
            year=self.scenario_year,
            coverage=0.95,
        )

        assumptions_map = build_budget_assumptions(self.scenario)
        year_assumptions = assumptions_map[self.scenario_year]

        for key, value in year_assumptions.items():
            self.assertIsNotNone(value, f"Assumption {key} should not be None")
            if key in DEFAULT_COST_ASSUMPTIONS:
                expected_coverage = key == "itn_campaign_coverage" and 0.95 or DEFAULT_COST_ASSUMPTIONS[key]
                self.assertEqual(
                    year_assumptions[key],
                    expected_coverage,
                    f"Default coverage for {key} should be {expected_coverage}",
                )

    def test_build_budget_assumptions_map_with_existing_iptp_edge_case(self):
        BudgetAssumptions.objects.create(
            scenario=self.scenario,
            intervention_assignment=self.assignment2,
            year=self.scenario_year,
            coverage=0.95,
        )

        year_assumptions = build_budget_assumptions(self.scenario)[self.scenario_year]
        # Check that the overridden values are present
        self.assertEqual(year_assumptions["iptp_anc_coverage"], 0.95)
        # Check that other default values are still present
        self.assertEqual(year_assumptions["itn_campaign_coverage"], 1.0)
        self.assertEqual(year_assumptions["itn_routine_coverage"], 0.3)
        self.assertEqual(year_assumptions["smc_coverage"], 1.0)
        self.assertEqual(year_assumptions["pmc_coverage"], 0.85)
        self.assertEqual(year_assumptions["vacc_coverage"], 0.84)

    def test_build_budget_assumptions_map_with_existing(self):
        BudgetAssumptions.objects.create(
            scenario=self.scenario,
            intervention_assignment=self.assignment1,
            year=self.scenario_year,
            coverage=0.95,
        )

        year_assumptions = build_budget_assumptions(self.scenario)[self.scenario_year]
        # Check that the overridden values are present
        self.assertEqual(year_assumptions["itn_campaign_coverage"], 0.95)
        # Check that other default values are still present
        self.assertEqual(year_assumptions["itn_routine_coverage"], 0.3)
        self.assertEqual(year_assumptions["iptp_anc_coverage"], 0.8)
        self.assertEqual(year_assumptions["smc_coverage"], 1.0)
        self.assertEqual(year_assumptions["pmc_coverage"], 0.85)
        self.assertEqual(year_assumptions["vacc_coverage"], 0.84)
