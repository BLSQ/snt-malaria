from rest_framework import status

from iaso.models import Account, MetricType, MetricValue, OrgUnit, OrgUnitType
from iaso.test import APITestCase
from plugins.snt_malaria.models import Intervention, InterventionAssignment, InterventionCategory, Scenario
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
        )
        cls.intervention_chemo_smc = Intervention.objects.create(
            name="SMC",
            created_by=cls.user,
            intervention_category=cls.int_category_chemoprevention,
            code="smc",
        )
        cls.intervention_chemo_iptp = Intervention.objects.create(
            name="IPTp",
            created_by=cls.user,
            intervention_category=cls.int_category_chemoprevention,
            code="iptp",
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

        # Create MetricValues for the org units (district1 and district2)
        MetricValue.objects.create(metric_type=metric_type_population, org_unit=self.district1, value=100000)
        MetricValue.objects.create(metric_type=metric_type_population, org_unit=self.district2, value=150000)

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

        # Find SMC intervention in the budget
        smc_intervention = None
        for intervention in budget_2025["interventions"]:
            if intervention["name"] == "smc":
                smc_intervention = intervention
                break

        self.assertIsNotNone(smc_intervention, "SMC intervention should be in the budget")
        self.assertEqual(smc_intervention["total_cost"], 198000.0)
        self.assertEqual(smc_intervention["total_pop"], 237500.0)
        self.assertEqual(len(smc_intervention["cost_breakdown"]), 1)
        self.assertEqual(smc_intervention["cost_breakdown"][0]["name"], "smc")
        self.assertEqual(smc_intervention["cost_breakdown"][0]["cost_class"], "Procurement")
        self.assertEqual(smc_intervention["cost_breakdown"][0]["cost"], 198000.0)

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
