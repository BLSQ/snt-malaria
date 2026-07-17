from rest_framework import status

from iaso.models.metric import MetricType
from plugins.snt_malaria.models import InterventionCostBreakdownLine, ScenarioYearlyCostAssignment
from plugins.snt_malaria.models.cost_unit_type import CostUnitType
from plugins.snt_malaria.permissions import SNT_SCENARIO_BASIC_WRITE_PERMISSION, SNT_SCENARIO_FULL_WRITE_PERMISSION
from plugins.snt_malaria.tests.common_base import SNTMalariaAPITestCase


BASE_URL = "/api/snt_malaria/scenario_yearly_cost_assignments/"


class ScenarioYearlyCostAssignmentAPITestCase(SNTMalariaAPITestCase):
    auto_create_account = False

    def setUp(self):
        super().setUp()

        self.account, self.user_with_full_perm = self.create_snt_account(
            name="Main Account",
            username="full",
            permissions=[SNT_SCENARIO_FULL_WRITE_PERMISSION],
        )
        self.user_with_basic_perm = self.create_user_with_profile(
            username="basic",
            account=self.account,
            permissions=[SNT_SCENARIO_BASIC_WRITE_PERMISSION],
        )
        self.user_no_perm = self.create_user_with_profile(username="noperm", account=self.account)

        self.scenario = self.create_snt_scenario(
            account=self.account,
            created_by=self.user_with_full_perm,
            name="Scenario Full User",
        )
        self.other_user_scenario = self.create_snt_scenario(
            account=self.account,
            created_by=self.user_with_basic_perm,
            name="Scenario Basic User",
        )
        self.locked_scenario = self.create_snt_scenario(
            account=self.account,
            created_by=self.user_with_full_perm,
            name="Locked Scenario",
            is_locked=True,
        )

        self.category = self.create_snt_intervention_category(
            name="Vaccination",
            account=self.account,
            created_by=self.user_with_full_perm,
        )
        self.intervention = self.create_snt_intervention(
            name="RTS,S",
            code="rts_s",
            intervention_category=self.category,
            created_by=self.user_with_full_perm,
        )

        self.unit_type = CostUnitType.objects.create(account=self.account, name="Other")
        self.metric_population = MetricType.objects.create(account=self.account, name="Population", code="pop")
        # Population-driven lines have a population layer; fixed-cost lines do not.
        self.population_line_1 = InterventionCostBreakdownLine.objects.create(
            intervention=self.intervention,
            unit_type=self.unit_type,
            name="Population line 1",
            category="Procurement",
            population_layer=self.metric_population,
            is_proportional=True,
            unit_cost=10,
            created_by=self.user_with_full_perm,
        )
        self.population_line_2 = InterventionCostBreakdownLine.objects.create(
            intervention=self.intervention,
            unit_type=self.unit_type,
            name="Population line 2",
            category="Operational",
            population_layer=self.metric_population,
            is_proportional=True,
            unit_cost=12,
            created_by=self.user_with_full_perm,
        )
        self.fixed_cost_line = InterventionCostBreakdownLine.objects.create(
            intervention=self.intervention,
            unit_type=self.unit_type,
            name="Fixed cost line",
            category="Supportive",
            population_layer=None,
            unit_cost=5,
            created_by=self.user_with_full_perm,
        )

        self.other_account, self.other_account_user = self.create_snt_account(
            name="Other Account",
            username="other",
            permissions=[SNT_SCENARIO_FULL_WRITE_PERMISSION],
        )
        self.other_account_scenario = self.create_snt_scenario(
            account=self.other_account,
            created_by=self.other_account_user,
            name="Other Scenario",
        )

        self.other_account_category = self.create_snt_intervention_category(
            name="Other Category",
            account=self.other_account,
            created_by=self.other_account_user,
        )
        self.other_account_intervention = self.create_snt_intervention(
            name="Other Intervention",
            created_by=self.other_account_user,
            intervention_category=self.other_account_category,
            code="other_int",
        )
        self.other_account_unit_type = CostUnitType.objects.create(account=self.other_account, name="Other")
        self.other_account_metric = MetricType.objects.create(account=self.other_account, name="Population", code="pop")
        self.other_account_cost_line = InterventionCostBreakdownLine.objects.create(
            intervention=self.other_account_intervention,
            unit_type=self.other_account_unit_type,
            name="Other line",
            category="Procurement",
            population_layer=self.other_account_metric,
            is_proportional=True,
            unit_cost=15,
            created_by=self.other_account_user,
        )

    def _create_scenario_yearly_cost(self, scenario, cost_line, year=2026, value="5.00"):
        return ScenarioYearlyCostAssignment.objects.create(
            scenario=scenario,
            cost_line=cost_line,
            year=year,
            value=value,
        )

    def _post_create_payload(self, user, scenario, cost_line):
        self.client.force_authenticate(user=user)
        return self.client.post(
            BASE_URL,
            {
                "scenario": scenario.id,
                "year": 2026,
                "cost_line": cost_line.id,
                "value": "12.00",
            },
            format="json",
        )

    def _patch_assignment_value(self, user, assignment, value):
        self.client.force_authenticate(user=user)
        return self.client.patch(
            f"{BASE_URL}{assignment.id}/",
            {
                "scenario": assignment.scenario.id,
                "value": value,
            },
            format="json",
        )

    def _list_assignments(self, user, scenario):
        self.client.force_authenticate(user=user)
        return self.client.get(f"{BASE_URL}?scenario={scenario.id}")

    def test_get_assignments_is_scoped_per_scenario(self):
        assignment_in_target = self._create_scenario_yearly_cost(self.scenario, self.population_line_1, value="5.00")
        self._create_scenario_yearly_cost(self.other_user_scenario, self.population_line_1, value="7.00")

        response = self._list_assignments(self.user_no_perm, self.scenario)
        result = self.assertJSONResponse(response, status.HTTP_200_OK)

        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["id"], assignment_in_target.id)
        self.assertEqual(result[0]["scenario"], self.scenario.id)

    def test_get_assignments_allows_full_basic_and_no_access_users_for_locked_and_unlocked_scenarios(self):
        target_assignment = self._create_scenario_yearly_cost(self.scenario, self.population_line_1, value="5.00")
        locked_assignment = self._create_scenario_yearly_cost(
            self.locked_scenario, self.population_line_1, value="6.00"
        )

        for user in (self.user_with_full_perm, self.user_with_basic_perm, self.user_no_perm):
            for scenario, expected_id in (
                (self.scenario, target_assignment.id),
                (self.locked_scenario, locked_assignment.id),
            ):
                with self.subTest(user=user.username, scenario=scenario.id):
                    response = self._list_assignments(user, scenario)
                    result = self.assertJSONResponse(response, status.HTTP_200_OK)

                    self.assertEqual(len(result), 1)
                    self.assertEqual(result[0]["id"], expected_id)
                    self.assertEqual(result[0]["scenario"], scenario.id)

    def test_create_is_scoped_per_scenario(self):
        valid_response = self._post_create_payload(self.user_with_full_perm, self.scenario, self.population_line_1)
        valid_result = self.assertJSONResponse(valid_response, status.HTTP_201_CREATED)
        self.assertEqual(valid_result["scenario"], self.scenario.id)

        cross_account_response = self._post_create_payload(
            self.user_with_full_perm,
            self.other_account_scenario,
            self.population_line_1,
        )
        cross_account_result = self.assertJSONResponse(cross_account_response, status.HTTP_400_BAD_REQUEST)
        self.assertIn("scenario", cross_account_result)

    def test_create_allows_basic_access_same_account(self):
        response = self._post_create_payload(self.user_with_basic_perm, self.scenario, self.population_line_1)
        result = self.assertJSONResponse(response, status.HTTP_201_CREATED)

        self.assertEqual(result["scenario"], self.scenario.id)
        self.assertEqual(result["cost_line"], self.population_line_1.id)

    def test_create_forbids_no_access_same_account(self):
        response = self._post_create_payload(self.user_no_perm, self.scenario, self.population_line_1)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_rejects_locked_scenario(self):
        response = self._post_create_payload(self.user_with_full_perm, self.locked_scenario, self.population_line_1)
        result = self.assertJSONResponse(response, status.HTTP_400_BAD_REQUEST)

        self.assertIn("scenario", result)

    def test_forbidden_when_user_has_no_access_to_scenario(self):
        assignment = self._create_scenario_yearly_cost(self.scenario, self.population_line_1, value="5.00")

        response = self._patch_assignment_value(self.user_with_basic_perm, assignment, "15.00")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_forbidden_to_update_when_scenario_is_locked(self):
        assignment = self._create_scenario_yearly_cost(self.locked_scenario, self.population_line_1, value="5.00")

        response = self._patch_assignment_value(self.user_with_full_perm, assignment, "20.00")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_updating_single_assignment_works(self):
        assignment = self._create_scenario_yearly_cost(self.scenario, self.population_line_1, value="5.00")

        response = self._patch_assignment_value(self.user_with_full_perm, assignment, "29.00")
        result = self.assertJSONResponse(response, status.HTTP_200_OK)

        assignment.refresh_from_db()
        self.assertEqual(result["id"], assignment.id)
        # population driver: API receives percentage (20.00), stored as fraction (0.20)
        self.assertEqual(str(assignment.value), "0.29")

    def test_updating_single_assignment_allows_basic_access_when_user_created_the_scenario(self):
        assignment = self._create_scenario_yearly_cost(self.other_user_scenario, self.population_line_1, value="5.00")

        response = self._patch_assignment_value(self.user_with_basic_perm, assignment, "21.00")
        result = self.assertJSONResponse(response, status.HTTP_200_OK)

        assignment.refresh_from_db()
        self.assertEqual(result["id"], assignment.id)
        # population driver: API receives percentage (21.00), stored as fraction (0.21)
        self.assertEqual(str(assignment.value), "0.21")

    def test_updating_single_assignment_forbids_no_access_same_account(self):
        assignment = self._create_scenario_yearly_cost(self.scenario, self.population_line_1, value="5.00")

        response = self._patch_assignment_value(self.user_no_perm, assignment, "22.00")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_assignment_value_rounding_for_population_driver(self):
        # float(Decimal("0.29")) * 100 == 28.999... which math.floor would truncate to 28.
        # The serializer must round correctly so the API returns "29", not "28".
        for stored_value, expected_display in [("0.29", "29"), ("0.57", "57"), ("0.03", "3")]:
            with self.subTest(stored_value=stored_value):
                ScenarioYearlyCostAssignment.objects.filter(scenario=self.scenario).delete()
                self._create_scenario_yearly_cost(self.scenario, self.population_line_1, value=stored_value)

                response = self._list_assignments(self.user_no_perm, self.scenario)
                result = self.assertJSONResponse(response, status.HTTP_200_OK)

                self.assertEqual(len(result), 1)
                self.assertEqual(result[0]["value"], expected_display)

    def test_deleting_assignment_is_not_allowed(self):
        assignment = self._create_scenario_yearly_cost(self.scenario, self.population_line_1, value="5.00")

        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.delete(f"{BASE_URL}{assignment.id}/")
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
