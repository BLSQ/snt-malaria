from rest_framework import status

from iaso.models import Account, MetricType, MetricValue, OrgUnit, OrgUnitType
from iaso.test import APITestCase
from plugins.snt_malaria.models import Intervention, InterventionAssignment, InterventionCategory, Scenario
from plugins.snt_malaria.models.budget_assumptions import BudgetAssumptions
from plugins.snt_malaria.models.budget_settings import BudgetSettings
from plugins.snt_malaria.models.cost_breakdown import InterventionCostBreakdownLine


BASE_URL = "/api/snt_malaria/budgets/"


class ScenarioAPITestCase(APITestCase):
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

        # Create intervention categories
        cls.int_category_vaccination = InterventionCategory.objects.create(
            name="Vaccination",
            account=cls.account,
            created_by=cls.user,
        )

        cls.int_category_chemoprevention = InterventionCategory.objects.create(
            name="Preventive Chemotherapy",
            account=cls.account,
            created_by=cls.user,
        )

        # Create interventions
        cls.intervention_vaccination_rts = Intervention.objects.create(
            name="RTS,S",
            created_by=cls.user,
            intervention_category=cls.int_category_vaccination,
            code="rts_s",
            short_name="RTS,S",
        )
        cls.intervention_chemo_smc = Intervention.objects.create(
            name="SMC",
            created_by=cls.user,
            intervention_category=cls.int_category_chemoprevention,
            code="smc",
            short_name="SMC",
        )
        cls.intervention_chemo_iptp = Intervention.objects.create(
            name="IPTp",
            created_by=cls.user,
            intervention_category=cls.int_category_chemoprevention,
            code="iptp",
            short_name="IPTp",
        )

        # Create Org Units
        cls.out_district = OrgUnitType.objects.create(name="DISTRICT")
        cls.district1 = OrgUnit.objects.create(org_unit_type=cls.out_district, name="District 1")
        cls.district2 = OrgUnit.objects.create(org_unit_type=cls.out_district, name="District 2")

        # Create assignments related to the scenario
        cls.assignment = InterventionAssignment.objects.create(
            scenario=cls.scenario,
            org_unit=cls.district1,
            intervention=cls.intervention_chemo_iptp,
            created_by=cls.user,
        )
        cls.assignment = InterventionAssignment.objects.create(
            scenario=cls.scenario,
            org_unit=cls.district2,
            intervention=cls.intervention_chemo_smc,
            created_by=cls.user,
        )
        cls.assignment = InterventionAssignment.objects.create(
            scenario=cls.scenario,
            org_unit=cls.district2,
            intervention=cls.intervention_vaccination_rts,
            created_by=cls.user,
        )

        cls.budgetSettings = BudgetSettings.objects.create(
            account=cls.account,
            local_currency="USD",  # Default to USD, can be changed per account
            exchange_rate=1.0,  # 1:1 exchange rate with USD as default
            inflation_rate=0.03,  # 3% inflation rate as default
        )

        cls.costLines = InterventionCostBreakdownLine.objects.bulk_create(
            [
                InterventionCostBreakdownLine(
                    intervention=cls.intervention_chemo_smc,
                    year=2025,
                    name="smc cost line",
                    category="Procurement",
                    unit_type="PER_SPAQ_3_11_MONTHS",
                    unit_cost=2.5,
                ),
                InterventionCostBreakdownLine(
                    intervention=cls.intervention_chemo_smc,
                    year=2026,
                    name="smc cost line",
                    category="Procurement",
                    unit_type="PER_SPAQ_3_11_MONTHS",
                    unit_cost=2.6,
                ),
            ]
        )

        cls.client.force_authenticate(user=cls.user)

    def test_calculate_budget_no_population_metric(self):
        """Test calculate_budget endpoint with mocked CSV data and budget calculation"""
        # Create SMC intervention assignment for district1
        InterventionAssignment.objects.create(
            scenario=self.scenario,
            org_unit=self.district1,
            intervention=self.intervention_chemo_smc,
            created_by=self.user,
        )

        url = f"{BASE_URL}?scenario_id={self.scenario.id}"
        response = self.client.post(url, {"scenario": self.scenario.id}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data[0], "No population MetricTypes found for this account")

    def test_calculate_budget_no_total_population_metric(self):
        """Test calculate_budget endpoint with mocked CSV data and budget calculation"""
        MetricType.objects.create(
            account=self.account,
            name="Total Population",
            code="POP_UNDER_5",
            description="Total population data",
            units="people",
        )
        # Create SMC intervention assignment for district1
        InterventionAssignment.objects.create(
            scenario=self.scenario,
            org_unit=self.district1,
            intervention=self.intervention_chemo_smc,
            created_by=self.user,
        )

        url = f"{BASE_URL}?scenario_id={self.scenario.id}"
        response = self.client.post(url, {"scenario": self.scenario.id}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data[0], "MetricType with code 'POPULATION' does not exist for this account")

    def test_calculate_budget_no_metric_values(self):
        """Test calculate_budget endpoint with mocked CSV data and budget calculation"""
        MetricType.objects.create(
            account=self.account,
            name="Total Population",
            code="POPULATION",
            description="Total population data",
            units="people",
        )
        # Create SMC intervention assignment for district1
        InterventionAssignment.objects.create(
            scenario=self.scenario,
            org_unit=self.district1,
            intervention=self.intervention_chemo_smc,
            created_by=self.user,
        )

        url = f"{BASE_URL}?scenario_id={self.scenario.id}"
        response = self.client.post(url, {"scenario": self.scenario.id}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data[0], "No population data found")

    def test_calculate_budget_success(self):
        """Test calculate_budget endpoint with mocked CSV data and budget calculation"""
        # Create MetricType for population
        metric_type_population = MetricType.objects.create(
            account=self.account,
            name="Total Population",
            code="POPULATION",
            description="Total population data",
            units="people",
        )
        metric_type_pop_under_5 = MetricType.objects.create(
            account=self.account,
            name="Total Population",
            code="POP_UNDER_5",
            description="Population under 5 year",
            units="child",
        )

        # Create MetricValues for the org units (district1 and district2)
        MetricValue.objects.create(metric_type=metric_type_population, org_unit=self.district1, value=10000000)
        MetricValue.objects.create(metric_type=metric_type_population, org_unit=self.district2, value=15000000)
        MetricValue.objects.create(metric_type=metric_type_pop_under_5, org_unit=self.district1, value=100000)
        MetricValue.objects.create(metric_type=metric_type_pop_under_5, org_unit=self.district2, value=150000)

        # Create SMC intervention assignment for district1
        InterventionAssignment.objects.create(
            scenario=self.scenario,
            org_unit=self.district1,
            intervention=self.intervention_chemo_smc,
            created_by=self.user,
        )

        url = f"{BASE_URL}?scenario_id={self.scenario.id}"
        response = self.client.post(url, {"scenario": self.scenario.id}, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Response should be a list of budgets by year (2025, 2026, 2027)
        self.assertEqual(len(response.data), 7)

        # Check first year (2025)
        budget_2025 = response.data["results"][0]
        self.assertEqual(budget_2025["year"], 2025)
        self.assertEqual(response.data["scenario"], self.scenario.id)
        self.assertIn("interventions", budget_2025)
        self.assertIn("org_units_costs", budget_2025)

        # Find SMC intervention in the budget
        smc_intervention = next(
            intervention for intervention in budget_2025["interventions"] if intervention["code"] == "smc"
        )

        self.assertIsNotNone(smc_intervention, "SMC intervention should be in the budget")
        self.assertEqual(smc_intervention["total_cost"], 1009800.0)
        self.assertEqual(smc_intervention["total_pop"], 237500.0)
        self.assertEqual(len(smc_intervention["cost_breakdown"]), 1)
        self.assertEqual(smc_intervention["cost_breakdown"][0]["category"], "Procurement")
        self.assertEqual(smc_intervention["cost_breakdown"][0]["cost"], 1009800.0)

        # Find Org unit cost
        smc_org_unit_costs = None
        for org_unit_costs in budget_2025["org_units_costs"]:
            if org_unit_costs["org_unit_id"] == self.district1.id:
                smc_org_unit_costs = org_unit_costs
                break

        self.assertIsNotNone(smc_org_unit_costs)
        self.assertEqual(smc_org_unit_costs["total_cost"], 403920.0)
        self.assertEqual(len(smc_org_unit_costs["interventions"]), 1)
        self.assertEqual(smc_org_unit_costs["interventions"][0]["code"], "smc")
        self.assertEqual(smc_org_unit_costs["interventions"][0]["type"], "SMC")
        self.assertEqual(smc_org_unit_costs["interventions"][0]["total_cost"], 403920.0)
        self.assertEqual(smc_org_unit_costs["interventions"][0]["id"], self.intervention_chemo_smc.id)

    def test_calculate_budget_missing_scenario(self):
        """Test calculate_budget endpoint without scenario parameter"""
        url = f"{BASE_URL}?scenario_id={self.scenario.id}"
        response = self.client.post(url, {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("scenario", response.data)

    def test_calculate_budget_invalid_scenario(self):
        """Test calculate_budget endpoint with non-existent scenario"""
        url = f"{BASE_URL}?scenario_id=99999"
        response = self.client.post(url, {"scenario": 99999}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("scenario", response.data)

    # Not goind to far into detailed testing of the budget calculator here,
    # just a basic test to ensure assumptions are applied correctly
    def test_calculate_budget_with_assumptions(self):
        """Test calculate_budget endpoint with mocked CSV data and budget calculation"""
        # Create MetricType for population
        metric_type_population = MetricType.objects.create(
            account=self.account,
            name="Total Population",
            code="POPULATION",
            description="Total population data",
            units="people",
        )
        metric_type_pop_under_5 = MetricType.objects.create(
            account=self.account,
            name="Total Population",
            code="POP_UNDER_5",
            description="Population under 5 year",
            units="child",
        )

        # Create MetricValues for the org units (district1 and district2)
        MetricValue.objects.create(metric_type=metric_type_population, org_unit=self.district1, value=10000000)
        MetricValue.objects.create(metric_type=metric_type_population, org_unit=self.district2, value=15000000)
        MetricValue.objects.create(metric_type=metric_type_pop_under_5, org_unit=self.district1, value=100000)
        MetricValue.objects.create(metric_type=metric_type_pop_under_5, org_unit=self.district2, value=150000)

        # Create SMC intervention assignment for district1
        InterventionAssignment.objects.create(
            scenario=self.scenario,
            org_unit=self.district1,
            intervention=self.intervention_chemo_smc,
            created_by=self.user,
        )

        BudgetAssumptions.objects.create(
            scenario=self.scenario,
            intervention_code="smc",
            coverage=0.8,
            divisor=0,
            bale_size=0,
            buffer_mult=1.1,
            doses_per_pw=0,
            age_string="",
            pop_prop_3_11=0.18,
            pop_prop_12_59=0.77,
            monthly_rounds=4,
            touchpoints=0,
            tablet_factor=0.0,
            doses_per_child=0,
        )

        url = f"{BASE_URL}?scenario_id={self.scenario.id}"
        response = self.client.post(url, {"scenario": self.scenario.id}, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Response should be a list of budgets by year (2025, 2026, 2027)
        self.assertEqual(len(response.data), 7)

        # Check first year (2025)
        budget_2025 = response.data["results"][0]
        self.assertEqual(budget_2025["year"], 2025)
        self.assertEqual(response.data["scenario"], self.scenario.id)
        self.assertIn("interventions", budget_2025)
        self.assertIn("org_units_costs", budget_2025)

        # Find SMC intervention in the budget
        smc_intervention = next(
            intervention for intervention in budget_2025["interventions"] if intervention["code"] == "smc"
        )

        self.assertIsNotNone(smc_intervention, "SMC intervention should be in the budget")
        self.assertAlmostEqual(smc_intervention["total_cost"], 1009800.0 * 0.8)
        self.assertAlmostEqual(smc_intervention["total_pop"], 237500.0 * 0.8)
        self.assertEqual(len(smc_intervention["cost_breakdown"]), 1)
        self.assertEqual(smc_intervention["cost_breakdown"][0]["category"], "Procurement")
        self.assertAlmostEqual(smc_intervention["cost_breakdown"][0]["cost"], 1009800.0 * 0.8)
        # Find Org unit cost
        smc_org_unit_costs = None
        for org_unit_costs in budget_2025["org_units_costs"]:
            if org_unit_costs["org_unit_id"] == self.district1.id:
                smc_org_unit_costs = org_unit_costs
                break

        self.assertIsNotNone(smc_org_unit_costs)
        self.assertAlmostEqual(smc_org_unit_costs["total_cost"], 403920.0 * 0.8)
        self.assertEqual(len(smc_org_unit_costs["interventions"]), 1)
        self.assertEqual(smc_org_unit_costs["interventions"][0]["code"], "smc")
        self.assertEqual(smc_org_unit_costs["interventions"][0]["type"], "SMC")
        self.assertAlmostEqual(smc_org_unit_costs["interventions"][0]["total_cost"], 403920.0 * 0.8)
        self.assertEqual(smc_org_unit_costs["interventions"][0]["id"], self.intervention_chemo_smc.id)
