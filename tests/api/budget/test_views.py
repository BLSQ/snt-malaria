from rest_framework import status

from iaso.models import MetricType, MetricValue, OrgUnit, OrgUnitType
from iaso.test import APITestCase
from plugins.snt_malaria.models import (
    Budget,
    Intervention,
    InterventionAssignment,
    InterventionCategory,
    Scenario,
)
from plugins.snt_malaria.models.budget_assumptions import BudgetAssumptions
from plugins.snt_malaria.models.budget_settings import BudgetSettings
from plugins.snt_malaria.models.cost_breakdown import InterventionCostBreakdownLine
from plugins.snt_malaria.permissions import SNT_SCENARIO_BASIC_WRITE_PERMISSION, SNT_SCENARIO_FULL_WRITE_PERMISSION


BASE_URL = "/api/snt_malaria/budgets/"


class ScenarioAPITestCase(APITestCase):
    def setUp(self):
        # Create a user and account for testing
        self.account, self.source, self.version, self.project = self.create_account_datasource_version_project(
            "source", "Test Account", "project"
        )
        self.user_with_full_perm, self.anon, self.user_no_perms = self.create_base_users(
            self.account, [SNT_SCENARIO_FULL_WRITE_PERMISSION], "testuser"
        )
        self.user_with_basic_perm = self.create_user_with_profile(
            username="testuserbasic", account=self.account, permissions=[SNT_SCENARIO_BASIC_WRITE_PERMISSION]
        )

        # Create a scenario
        self.scenario = Scenario.objects.create(
            account=self.account,
            created_by=self.user_with_full_perm,
            name="Test Scenario",
            description="A test scenario description.",
            start_year=2025,
            end_year=2028,
        )

        # Create intervention categories
        self.int_category_vaccination = InterventionCategory.objects.create(
            name="Vaccination",
            account=self.account,
            created_by=self.user_with_full_perm,
        )
        self.int_category_chemoprevention = InterventionCategory.objects.create(
            name="Preventive Chemotherapy",
            account=self.account,
            created_by=self.user_with_full_perm,
        )

        # Create interventions
        self.intervention_vaccination_rts = Intervention.objects.create(
            name="RTS,S",
            created_by=self.user_with_full_perm,
            intervention_category=self.int_category_vaccination,
            code="rts_s",
            short_name="RTS,S",
        )
        self.intervention_chemo_smc = Intervention.objects.create(
            name="SMC",
            created_by=self.user_with_full_perm,
            intervention_category=self.int_category_chemoprevention,
            code="smc",
            short_name="SMC",
        )
        self.intervention_chemo_iptp = Intervention.objects.create(
            name="IPTp",
            created_by=self.user_with_full_perm,
            intervention_category=self.int_category_chemoprevention,
            code="iptp",
            short_name="IPTp",
        )

        # Create Org Units
        self.out_district = OrgUnitType.objects.create(name="DISTRICT")
        self.district1 = OrgUnit.objects.create(org_unit_type=self.out_district, name="District 1")
        self.district2 = OrgUnit.objects.create(org_unit_type=self.out_district, name="District 2")

        # Create assignments related to the scenario
        self.assignment_iptp = InterventionAssignment.objects.create(
            scenario=self.scenario,
            org_unit=self.district1,
            intervention=self.intervention_chemo_iptp,
            created_by=self.user_with_full_perm,
        )
        self.assignment_smc = InterventionAssignment.objects.create(
            scenario=self.scenario,
            org_unit=self.district2,
            intervention=self.intervention_chemo_smc,
            created_by=self.user_with_full_perm,
        )
        self.assignment_rts = InterventionAssignment.objects.create(
            scenario=self.scenario,
            org_unit=self.district2,
            intervention=self.intervention_vaccination_rts,
            created_by=self.user_with_full_perm,
        )

        self.budget_settings = BudgetSettings.objects.create(
            account=self.account,
            local_currency="USD",  # Default to USD, can be changed per account
            exchange_rate=1.0,  # 1:1 exchange rate with USD as default
            inflation_rate=0.03,  # 3% inflation rate as default
        )

        self.cost_lines = InterventionCostBreakdownLine.objects.bulk_create(
            [
                InterventionCostBreakdownLine(
                    intervention=self.intervention_chemo_smc,
                    year=2025,
                    name="smc cost line",
                    category="Procurement",
                    unit_type="PER_SPAQ_3_11_MONTHS",
                    unit_cost=2.5,
                ),
                InterventionCostBreakdownLine(
                    intervention=self.intervention_chemo_smc,
                    year=2026,
                    name="smc cost line",
                    category="Procurement",
                    unit_type="PER_SPAQ_3_11_MONTHS",
                    unit_cost=2.6,
                ),
            ]
        )

        self.budget_1 = Budget.objects.create(
            scenario=self.scenario,
            name="Test Budget 1",
            created_by=self.user_with_full_perm,
            cost_input={},
            population_input={},
            assumptions={},
            results={},
        )

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

        MetricValue.objects.create(
            metric_type=metric_type_population, org_unit=self.district1, value=10000000, year=2025
        )
        MetricValue.objects.create(
            metric_type=metric_type_population, org_unit=self.district2, value=15000000, year=2025
        )
        MetricValue.objects.create(
            metric_type=metric_type_pop_under_5, org_unit=self.district1, value=100000, year=2025
        )
        MetricValue.objects.create(
            metric_type=metric_type_pop_under_5, org_unit=self.district2, value=150000, year=2025
        )

    def test_calculate_budget_no_population_metric(self):
        MetricType.objects.all().delete()
        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.post(BASE_URL, {"scenario": self.scenario.id}, format="json")
        result = self.assertJSONResponse(response, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(result[0], "No population MetricTypes found for this account")

    def test_calculate_budget_no_total_population_metric(self):
        MetricType.objects.all().delete()
        MetricType.objects.create(
            account=self.account,
            name="Total Population under 5",
            code="POP_UNDER_5",
            description="Total population data under 5",
            units="people",
        )

        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.post(BASE_URL, {"scenario": self.scenario.id}, format="json")

        result = self.assertJSONResponse(response, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(result[0], "MetricType with code 'POPULATION' does not exist for this account")

    def test_calculate_budget_no_metric_values(self):
        MetricType.objects.all().delete()
        MetricType.objects.create(
            account=self.account,
            name="Total Population",
            code="POPULATION",
            description="Total population data",
            units="people",
        )

        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.post(BASE_URL, {"scenario": self.scenario.id}, format="json")

        result = self.assertJSONResponse(response, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(result[0], "No population data found")

    def test_calculate_budget_missing_scenario(self):
        """Test calculate_budget endpoint without scenario parameter"""
        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.post(BASE_URL, {}, format="json")

        result = self.assertJSONResponse(response, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(result["scenario"][0], "This field is required.")

    def test_calculate_budget_invalid_scenario(self):
        """Test calculate_budget endpoint with non-existent scenario"""
        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.post(BASE_URL, {"scenario": 99999}, format="json")

        result = self.assertJSONResponse(response, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Invalid pk "99999" - object does not exist.', result["scenario"][0])

    def test_calculate_budget_scenario_without_interventions(self):
        """Test calculate_budget endpoint with a scenario that has no intervention assignments"""
        # Create a new scenario without interventions
        empty_scenario = Scenario.objects.create(
            account=self.account,
            created_by=self.user_with_full_perm,
            name="Empty Scenario",
            description="A scenario with no interventions.",
            start_year=2025,
            end_year=2028,
        )

        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.post(BASE_URL, {"scenario": empty_scenario.id}, format="json")

        result = self.assertJSONResponse(response, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(result["scenario"][0], "Scenario must have at least one intervention assignment.")

    def test_calculate_budget_unauthenticated(self):
        """Test calculate_budget endpoint without authentication"""
        response = self.client.post(BASE_URL, {"scenario": self.scenario.id}, format="json")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_calculate_budget_no_perms(self):
        """Test calculate_budget endpoint with a user that has no permissions"""
        self.client.force_authenticate(user=self.user_no_perms)
        response = self.client.post(BASE_URL, {"scenario": self.scenario.id}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_calculate_budget_basic_perm_other_scenario(self):
        """Test calculate_budget endpoint with a user that has basic permissions but does not own the scenario"""
        self.client.force_authenticate(user=self.user_with_basic_perm)
        response = self.client.post(BASE_URL, {"scenario": self.scenario.id}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_calculate_budget_basic_perm_own_scenario(self):
        """Test calculate_budget endpoint with a user that has basic permissions and owns the scenario"""
        # Create a scenario owned by the user_with_basic_perm
        scenario_owned = Scenario.objects.create(
            account=self.account,
            created_by=self.user_with_basic_perm,
            name="Owned Scenario",
            description="A scenario owned by the basic perm user.",
            start_year=2025,
            end_year=2028,
        )
        count_before = Budget.objects.count()

        # Create SMC intervention assignment for district1
        InterventionAssignment.objects.create(
            scenario=scenario_owned,
            org_unit=self.district1,
            intervention=self.intervention_chemo_smc,
            created_by=self.user_with_basic_perm,
        )

        self.client.force_authenticate(user=self.user_with_basic_perm)
        response = self.client.post(BASE_URL, {"scenario": scenario_owned.id}, format="json")

        # We just want to confirm that the budget is created successfully
        # without going into calculation details, which are covered by other tests
        result = self.assertJSONResponse(response, status.HTTP_201_CREATED)
        result_id = result["id"]
        self.assertEqual(Budget.objects.count(), count_before + 1)
        new_budget = Budget.objects.get(id=result_id)
        self.assertEqual(new_budget.scenario.id, scenario_owned.id)
        self.assertEqual(new_budget.created_by, self.user_with_basic_perm)

    def test_calculate_budget_full_perm_other_scenario(self):
        # Create a scenario owned by the user_with_basic_perm
        scenario_owned = Scenario.objects.create(
            account=self.account,
            created_by=self.user_with_basic_perm,
            name="Owned Scenario",
            description="A scenario owned by the basic perm user.",
            start_year=2025,
            end_year=2028,
        )
        count_before = Budget.objects.count()

        # Create SMC intervention assignment for district1
        InterventionAssignment.objects.create(
            scenario=scenario_owned,
            org_unit=self.district1,
            intervention=self.intervention_chemo_smc,
            created_by=self.user_with_basic_perm,
        )

        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.post(BASE_URL, {"scenario": scenario_owned.id}, format="json")

        # We just want to confirm that the budget is created successfully
        # without going into calculation details, which are covered by other tests
        result = self.assertJSONResponse(response, status.HTTP_201_CREATED)
        result_id = result["id"]
        self.assertEqual(Budget.objects.count(), count_before + 1)
        new_budget = Budget.objects.get(id=result_id)
        self.assertEqual(new_budget.scenario.id, scenario_owned.id)
        self.assertEqual(new_budget.created_by, self.user_with_full_perm)

    def test_calculate_budget_full_perm_own_scenario(self):
        # Create SMC intervention assignment for district1
        InterventionAssignment.objects.create(
            scenario=self.scenario,
            org_unit=self.district1,
            intervention=self.intervention_chemo_smc,
            created_by=self.user_with_full_perm,
        )

        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.post(BASE_URL, {"scenario": self.scenario.id}, format="json")

        result = self.assertJSONResponse(response, status.HTTP_201_CREATED)

        # Response should be a list of budgets by year 2025 to 2028
        self.assertEqual(len(result["results"]), 4)

        # Check first year (2025)
        budget_2025 = result["results"][0]
        self.assertEqual(budget_2025["year"], 2025)
        self.assertEqual(result["scenario"], self.scenario.id)
        self.assertIn("interventions", budget_2025)
        self.assertIn("org_units_costs", budget_2025)

        # Find SMC intervention in the budget
        smc_intervention = next(
            intervention for intervention in budget_2025["interventions"] if intervention["code"] == "smc"
        )

        self.assertIsNotNone(smc_intervention, "SMC intervention should be in the budget")
        self.assertEqual(smc_intervention["total_cost"], 1009800.0000000001)
        self.assertEqual(smc_intervention["total_pop"], 237500.0)
        self.assertEqual(len(smc_intervention["cost_breakdown"]), 1)
        self.assertEqual(smc_intervention["cost_breakdown"][0]["category"], "Procurement")
        self.assertEqual(smc_intervention["cost_breakdown"][0]["cost"], 1009800.0000000001)

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

    # Not going to far into detailed testing of the budget calculator here,
    # just a basic test to ensure assumptions are applied correctly
    def test_calculate_budget_with_assumptions(self):
        """Test calculate_budget endpoint with mocked CSV data and budget calculation"""
        # Create SMC intervention assignment for district1
        InterventionAssignment.objects.create(
            scenario=self.scenario,
            org_unit=self.district1,
            intervention=self.intervention_chemo_smc,
            created_by=self.user_with_full_perm,
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

        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.post(BASE_URL, {"scenario": self.scenario.id}, format="json")

        result = self.assertJSONResponse(response, status.HTTP_201_CREATED)

        # Response should be a list of budgets by year 2025 to 2028
        self.assertEqual(len(result["results"]), 4)

        # Check first year (2025)
        budget_2025 = result["results"][0]
        self.assertEqual(budget_2025["year"], 2025)
        self.assertEqual(result["scenario"], self.scenario.id)
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

        db_budget = Budget.objects.get(id=result["id"])

        population_df = db_budget.population_input

        for item in population_df:
            if item.get("org_unit_id") == self.district1.id and item.get("year") == 2025:
                self.assertEqual(item.get("pop_total"), "10000000")
                self.assertEqual(item.get("pop_under_5"), "100000")

            if item.get("org_unit_id") == self.district2.id and item.get("year") == 2025:
                self.assertEqual(item.get("pop_total"), "15000000")
                self.assertEqual(item.get("pop_under_5"), "150000")

    def test_list_budgets(self):
        """
        This endpoint is available to all authenticated users, regardless of permissions.
        """
        new_budget = Budget.objects.create(
            scenario=self.scenario,
            name="Test Budget 2",
            created_by=self.user_with_full_perm,
            cost_input={},
            population_input={},
            assumptions={},
            results={},
        )

        self.client.force_authenticate(user=self.user_no_perms)
        response = self.client.get(BASE_URL)

        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        ids = [budget["id"] for budget in result]
        self.assertCountEqual(ids, [self.budget_1.id, new_budget.id])

        self.client.force_authenticate(user=self.user_with_basic_perm)
        response = self.client.get(BASE_URL)

        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        ids = [budget["id"] for budget in result]
        self.assertCountEqual(ids, [self.budget_1.id, new_budget.id])

        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.get(BASE_URL)

        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        ids = [budget["id"] for budget in result]
        self.assertCountEqual(ids, [self.budget_1.id, new_budget.id])

    def test_list_budgets_unauthenticated(self):
        response = self.client.get(BASE_URL)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_retrieve_budget(self):
        """
        This endpoint is available to all authenticated users, regardless of permissions.
        """
        self.client.force_authenticate(user=self.user_no_perms)
        response = self.client.get(f"{BASE_URL}{self.budget_1.id}/")

        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertEqual(result["id"], self.budget_1.id)
        self.assertEqual(result["name"], self.budget_1.name)
        self.assertEqual(result["scenario"], self.scenario.id)

        self.client.force_authenticate(user=self.user_with_basic_perm)
        response = self.client.get(f"{BASE_URL}{self.budget_1.id}/")

        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertEqual(result["id"], self.budget_1.id)
        self.assertEqual(result["name"], self.budget_1.name)
        self.assertEqual(result["scenario"], self.scenario.id)

        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.get(f"{BASE_URL}{self.budget_1.id}/")

        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertEqual(result["id"], self.budget_1.id)
        self.assertEqual(result["name"], self.budget_1.name)
        self.assertEqual(result["scenario"], self.scenario.id)

    def test_retrieve_budget_unauthenticated(self):
        response = self.client.get(f"{BASE_URL}{self.budget_1.id}/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_retrieve_budget_invalid_id(self):
        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.get(f"{BASE_URL}99999/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_retrieve_budget_from_another_account(self):
        # Create another account and budget
        other_account, _, _, _ = self.create_account_datasource_version_project(
            "other_source", "Other Account", "other_project"
        )
        other_user, _, _ = self.create_base_users(other_account, [SNT_SCENARIO_FULL_WRITE_PERMISSION], "otheruser")
        other_scenario = Scenario.objects.create(
            account=other_account,
            created_by=other_user,
            name="Other Scenario",
            description="A scenario for the other account.",
            start_year=2025,
            end_year=2028,
        )
        other_budget = Budget.objects.create(
            scenario=other_scenario,
            name="Other Budget",
            created_by=other_user,
            cost_input={},
            population_input={},
            assumptions={},
            results={},
        )

        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.get(f"{BASE_URL}{other_budget.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_latest(self):
        """
        This endpoint is available to all authenticated users, regardless of permissions.
        """
        budget_2 = Budget.objects.create(
            scenario=self.scenario,
            name="Test Budget 2",
            created_by=self.user_with_full_perm,
            cost_input={},
            population_input={},
            assumptions={},
            results={},
        )

        self.client.force_authenticate(user=self.user_no_perms)
        response = self.client.get(f"{BASE_URL}get_latest/")

        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertEqual(result["id"], budget_2.id)

        self.client.force_authenticate(user=self.user_with_basic_perm)
        response = self.client.get(f"{BASE_URL}get_latest/")

        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertEqual(result["id"], budget_2.id)

        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.get(f"{BASE_URL}get_latest/")

        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertEqual(result["id"], budget_2.id)

    def test_get_latest_no_budgets(self):
        Budget.objects.all().delete()

        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.get(f"{BASE_URL}get_latest/")

        result = self.assertJSONResponse(response, status.HTTP_404_NOT_FOUND)
        self.assertEqual(result["detail"], "No budget found")

    def test_get_latest_unauthenticated(self):
        response = self.client.get(f"{BASE_URL}get_latest/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
