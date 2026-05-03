from rest_framework import status
from snt_malaria_budgeting import DEFAULT_COST_ASSUMPTIONS

from plugins.snt_malaria.models import (
    BudgetAssumptions,
)
from plugins.snt_malaria.permissions import SNT_SCENARIO_BASIC_WRITE_PERMISSION, SNT_SCENARIO_FULL_WRITE_PERMISSION
from plugins.snt_malaria.tests.common_base import SNTMalariaAPITestCase


BASE_URL = "/api/snt_malaria/budget_assumptions/"
MANY_URL = f"{BASE_URL}many/"
DEFAULT_URL = f"{BASE_URL}default/"


class BudgetAssumptionsAPITestCase(SNTMalariaAPITestCase):
    auto_create_account = False

    def setUp(self):
        super().setUp()

        self.account, self.user_with_full_perm, self.source, self.version, self.project = (
            self.create_snt_account_with_project(
                source_name="source",
                account_name="Test Account",
                project_name="project",
                username="testuserfull",
                permissions=[SNT_SCENARIO_FULL_WRITE_PERMISSION],
            )
        )
        self.anon = None
        self.user_no_perms = self.create_user_with_profile(
            username="testuser_no_perms",
            account=self.account,
        )
        self.user_with_basic_perm = self.create_user_with_profile(
            username="testuserbasic", account=self.account, permissions=[SNT_SCENARIO_BASIC_WRITE_PERMISSION]
        )

        self.scenario = self._create_scenario(
            account=self.account,
            created_by=self.user_with_full_perm,
            name="Scenario Full User",
        )
        self.basic_user_scenario = self._create_scenario(
            account=self.account,
            created_by=self.user_with_basic_perm,
            name="Scenario Basic User",
        )

        defaults = self.create_snt_default_interventions_setup(
            scenario=self.scenario,
            account=self.account,
            created_by=self.user_with_full_perm,
        )
        self.int_category = defaults["category_vaccination"]
        self.intervention_rts = defaults["intervention_rts"]
        self.intervention_smc = defaults["intervention_smc"]
        self.org_unit_type = defaults["org_unit_type"]
        self.district_1 = defaults["district_1"]
        self.district_2 = defaults["district_2"]
        self.assignment_a = defaults["assignment_a"]
        self.assignment_b = defaults["assignment_b"]
        self.basic_assignment = self._create_assignment(
            self.basic_user_scenario,
            self.district_1,
            self.intervention_rts,
            created_by=self.user_with_basic_perm,
        )

        self.other_account, self.other_user = self.create_snt_account(
            name="Other Account",
            username="otheruser",
            permissions=[SNT_SCENARIO_FULL_WRITE_PERMISSION],
        )
        self.other_scenario = self._create_scenario(
            account=self.other_account,
            created_by=self.other_user,
            name="Other Account Scenario",
        )
        self.other_int_category = self.create_snt_intervention_category(
            name="Other Category",
            account=self.other_account,
            created_by=self.other_user,
        )
        self.other_intervention = self.create_snt_intervention(
            name="Other Intervention",
            created_by=self.other_user,
            intervention_category=self.other_int_category,
            code="other_int",
        )
        self.other_assignment = self._create_assignment(
            self.other_scenario,
            self.district_1,
            self.other_intervention,
            created_by=self.other_user,
        )

    def _create_scenario(self, account, created_by, name):
        return self.create_snt_scenario(
            account=account,
            created_by=created_by,
            name=name,
            description=f"{name} description",
        )

    def _create_assignment(self, scenario, org_unit, intervention, created_by=None):
        return self.create_snt_assignment(
            scenario,
            org_unit,
            intervention,
            created_by=created_by or scenario.created_by,
        )

    def _build_many_payload(self, scenario, assignments, budget_assumptions):
        return {
            "scenario": scenario.id,
            "intervention_assignments": [assignment.id for assignment in assignments],
            "budget_assumptions": budget_assumptions,
        }

    def test_get_budget_assumptions_unauthenticated(self):
        response = self.client.get(f"{BASE_URL}?scenario={self.scenario.id}")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_default_budget_assumption(self):
        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.get(f"{DEFAULT_URL}")
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        expected_defaults = DEFAULT_COST_ASSUMPTIONS

        for key, result_value in result.items():
            coverage_key = f"{key}_coverage"
            self.assertIn(coverage_key, expected_defaults)
            self.assertEqual(result_value["coverage"], expected_defaults[coverage_key])

    def test_get_budget_assumptions_scenario_other_account(self):
        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.get(f"{BASE_URL}?scenario={self.other_scenario.id}")
        result = self.assertJSONResponse(response, status.HTTP_400_BAD_REQUEST)
        self.assertIn("scenario", result)

    def test_get_budget_assumptions_authenticated_without_write_permission(self):
        BudgetAssumptions.objects.create(
            scenario=self.scenario,
            intervention_assignment=self.assignment_a,
            year=2025,
            coverage=0.55,
        )

        self.client.force_authenticate(user=self.user_no_perms)
        response = self.client.get(f"{BASE_URL}?scenario={self.scenario.id}")
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertEqual(len(result), 1)

    def test_get_budget_assumptions_filters_by_year(self):
        BudgetAssumptions.objects.create(
            scenario=self.scenario,
            intervention_assignment=self.assignment_a,
            year=2025,
            coverage=0.55,
        )
        BudgetAssumptions.objects.create(
            scenario=self.scenario,
            intervention_assignment=self.assignment_a,
            year=2026,
            coverage=0.75,
        )

        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.get(f"{BASE_URL}?scenario={self.scenario.id}&year=2025")
        result = self.assertJSONResponse(response, status.HTTP_200_OK)

        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["year"], 2025)
        self.assertEqual(result[0]["intervention_assignment"], self.assignment_a.id)

    def test_get_budget_assumptions_retrieves_year_and_intervention_assignment(self):
        assumption_a = BudgetAssumptions.objects.create(
            scenario=self.scenario,
            intervention_assignment=self.assignment_a,
            year=2025,
            coverage=0.55,
        )
        assumption_b = BudgetAssumptions.objects.create(
            scenario=self.scenario,
            intervention_assignment=self.assignment_b,
            year=2026,
            coverage=0.70,
        )

        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.get(f"{BASE_URL}?scenario={self.scenario.id}")
        result = self.assertJSONResponse(response, status.HTTP_200_OK)

        self.assertEqual(len(result), 2)
        by_id = {item["id"]: item for item in result}

        self.assertEqual(by_id[assumption_a.id]["intervention_assignment"], self.assignment_a.id)
        self.assertEqual(by_id[assumption_a.id]["year"], 2025)
        self.assertEqual(by_id[assumption_a.id]["scenario"], self.scenario.id)

        self.assertEqual(by_id[assumption_b.id]["intervention_assignment"], self.assignment_b.id)
        self.assertEqual(by_id[assumption_b.id]["year"], 2026)
        self.assertEqual(by_id[assumption_b.id]["scenario"], self.scenario.id)

    def test_get_budget_assumptions_returns_one_row_per_assignment_and_year(self):
        self.client.force_authenticate(user=self.user_with_full_perm)
        payload = self._build_many_payload(
            scenario=self.scenario,
            assignments=[self.assignment_a, self.assignment_b],
            budget_assumptions=[
                {"year": 2025, "coverage": 0.80},
                {"year": 2026, "coverage": 0.90},
            ],
        )

        create_response = self.client.post(MANY_URL, payload, format="json")
        self.assertJSONResponse(create_response, status.HTTP_200_OK)

        list_response = self.client.get(f"{BASE_URL}?scenario={self.scenario.id}")
        result = self.assertJSONResponse(list_response, status.HTTP_200_OK)

        self.assertEqual(len(result), 4)
        assignment_year_pairs = {(item["intervention_assignment"], item["year"]) for item in result}
        self.assertEqual(
            assignment_year_pairs,
            {
                (self.assignment_a.id, 2025),
                (self.assignment_a.id, 2026),
                (self.assignment_b.id, 2025),
                (self.assignment_b.id, 2026),
            },
        )

    def test_post_many_budget_assumptions_requires_write_permission(self):
        payload = self._build_many_payload(
            scenario=self.scenario,
            assignments=[self.assignment_a],
            budget_assumptions=[{"year": 2025, "coverage": 0.80}],
        )

        self.client.force_authenticate(user=self.user_no_perms)
        response = self.client.post(MANY_URL, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_post_many_budget_assumptions_unauthenticated(self):
        payload = self._build_many_payload(
            scenario=self.scenario,
            assignments=[self.assignment_a],
            budget_assumptions=[{"year": 2025, "coverage": 0.80}],
        )
        response = self.client.post(MANY_URL, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_post_many_budget_assumptions_invalid_scenario(self):
        payload = {
            "scenario": 999999,
            "intervention_assignments": [self.assignment_a.id],
            "budget_assumptions": [{"year": 2025, "coverage": 0.80}],
        }
        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.post(MANY_URL, payload, format="json")
        result = self.assertJSONResponse(response, status.HTTP_400_BAD_REQUEST)
        self.assertIn("scenario", result)

    def test_post_many_budget_assumptions_scenario_other_account(self):
        payload = {
            "scenario": self.other_scenario.id,
            "intervention_assignments": [self.assignment_a.id],
            "budget_assumptions": [{"year": 2025, "coverage": 0.80}],
        }
        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.post(MANY_URL, payload, format="json")
        result = self.assertJSONResponse(response, status.HTTP_400_BAD_REQUEST)
        self.assertIn("scenario", result)

    def test_post_many_budget_assumptions_requires_non_empty_assignments(self):
        payload = self._build_many_payload(
            scenario=self.scenario,
            assignments=[],
            budget_assumptions=[{"year": 2025, "coverage": 0.80}],
        )
        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.post(MANY_URL, payload, format="json")
        result = self.assertJSONResponse(response, status.HTTP_400_BAD_REQUEST)
        self.assertIn("intervention_assignments", result)

    def test_post_many_budget_assumptions_rejects_assignments_from_other_scenario(self):
        scenario_2 = self._create_scenario(
            account=self.account,
            created_by=self.user_with_full_perm,
            name="Scenario 2",
        )
        scenario_2_assignment = self._create_assignment(scenario_2, self.district_1, self.intervention_rts)

        payload = self._build_many_payload(
            scenario=self.scenario,
            assignments=[scenario_2_assignment],
            budget_assumptions=[{"year": 2025, "coverage": 0.80}],
        )
        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.post(MANY_URL, payload, format="json")
        result = self.assertJSONResponse(response, status.HTTP_400_BAD_REQUEST)
        self.assertIn("intervention_assignments", result)

    def test_post_many_budget_assumptions_with_basic_permission_only_for_own_scenario(self):
        own_payload = self._build_many_payload(
            scenario=self.basic_user_scenario,
            assignments=[self.basic_assignment],
            budget_assumptions=[{"year": 2025, "coverage": 0.80}],
        )

        self.client.force_authenticate(user=self.user_with_basic_perm)
        own_response = self.client.post(MANY_URL, own_payload, format="json")
        own_result = self.assertJSONResponse(own_response, status.HTTP_200_OK)
        self.assertEqual(len(own_result), 1)

        other_payload = self._build_many_payload(
            scenario=self.scenario,
            assignments=[self.assignment_a],
            budget_assumptions=[{"year": 2025, "coverage": 0.80}],
        )
        other_response = self.client.post(MANY_URL, other_payload, format="json")
        other_result = self.assertJSONResponse(other_response, status.HTTP_403_FORBIDDEN)
        self.assertIn("User does not have permission to modify assumptions for this scenario", other_result["detail"])

    def test_post_many_budget_assumptions_with_full_permission_other_users_scenario(self):
        payload = self._build_many_payload(
            scenario=self.basic_user_scenario,
            assignments=[self.basic_assignment],
            budget_assumptions=[{"year": 2025, "coverage": 0.66}],
        )
        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.post(MANY_URL, payload, format="json")
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["scenario"], self.basic_user_scenario.id)

    def test_post_many_budget_assumptions_keeps_single_row_per_assignment_and_year(self):
        self.client.force_authenticate(user=self.user_with_full_perm)

        first_payload = self._build_many_payload(
            scenario=self.scenario,
            assignments=[self.assignment_a],
            budget_assumptions=[{"year": 2025, "coverage": 0.40}],
        )
        self.assertJSONResponse(self.client.post(MANY_URL, first_payload, format="json"), status.HTTP_200_OK)

        second_payload = self._build_many_payload(
            scenario=self.scenario,
            assignments=[self.assignment_a],
            budget_assumptions=[{"year": 2025, "coverage": 0.70}],
        )
        self.assertJSONResponse(self.client.post(MANY_URL, second_payload, format="json"), status.HTTP_200_OK)

        assumptions = BudgetAssumptions.objects.filter(
            scenario=self.scenario,
            intervention_assignment=self.assignment_a,
            year=2025,
        )
        self.assertEqual(assumptions.count(), 1)
        self.assertEqual(str(assumptions.first().coverage), "0.70")

    def test_post_many_budget_assumptions_updates_only_given_scenario_assignments_and_years(self):
        target_assumption = BudgetAssumptions.objects.create(
            scenario=self.scenario,
            intervention_assignment=self.assignment_a,
            year=2025,
            coverage=0.10,
        )
        same_scenario_other_assignment = BudgetAssumptions.objects.create(
            scenario=self.scenario,
            intervention_assignment=self.assignment_b,
            year=2025,
            coverage=0.20,
        )
        same_scenario_other_year = BudgetAssumptions.objects.create(
            scenario=self.scenario,
            intervention_assignment=self.assignment_a,
            year=2026,
            coverage=0.30,
        )
        other_scenario_assumption = BudgetAssumptions.objects.create(
            scenario=self.other_scenario,
            intervention_assignment=self.other_assignment,
            year=2025,
            coverage=0.40,
        )

        self.client.force_authenticate(user=self.user_with_full_perm)
        payload = self._build_many_payload(
            scenario=self.scenario,
            assignments=[self.assignment_a],
            budget_assumptions=[{"year": 2025, "coverage": 0.95}],
        )
        self.assertJSONResponse(self.client.post(MANY_URL, payload, format="json"), status.HTTP_200_OK)

        assumptions = BudgetAssumptions.objects.filter(
            scenario=self.scenario,
        )

        target_assumption = assumptions.get(year=2025, intervention_assignment=self.assignment_a)
        same_scenario_other_assignment = assumptions.get(year=2025, intervention_assignment=self.assignment_b)
        same_scenario_other_year = assumptions.get(year=2026, intervention_assignment=self.assignment_a)
        other_scenario_assumption = BudgetAssumptions.objects.get(id=other_scenario_assumption.id)

        self.assertEqual(str(target_assumption.coverage), "0.95")
        self.assertEqual(str(same_scenario_other_assignment.coverage), "0.20")
        self.assertEqual(str(same_scenario_other_year.coverage), "0.30")
        self.assertEqual(str(other_scenario_assumption.coverage), "0.40")
