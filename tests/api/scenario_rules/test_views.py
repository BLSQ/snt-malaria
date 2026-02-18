from rest_framework import status

from plugins.snt_malaria.tests.api.scenario_rules.common_base import ScenarioRulesTestBase


class ScenarioRuleAPITestCase(ScenarioRulesTestBase):
    BASE_URL = "/api/snt_malaria/scenario_rules/"

    def test_list_scenario_rules(self):
        """
        This endpoint is available to all authenticated users, regardless of permissions.
        """
        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.get(self.BASE_URL, {"scenario": self.scenario.id})
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertEqual(len(result), 2)

        ids = [item["id"] for item in result]
        self.assertCountEqual(ids, [self.scenario_rule_1.id, self.scenario_rule_2.id])

        self.client.force_authenticate(user=self.user_with_basic_perm)
        response = self.client.get(self.BASE_URL, {"scenario": self.scenario.id})  # does not belong to that user
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertEqual(len(result), 2)

        ids = [item["id"] for item in result]
        self.assertCountEqual(ids, [self.scenario_rule_1.id, self.scenario_rule_2.id])

        self.client.force_authenticate(user=self.user_no_perm)
        response = self.client.get(self.BASE_URL, {"scenario": self.scenario.id})  # does not belong to that user
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertEqual(len(result), 2)

        ids = [item["id"] for item in result]
        self.assertCountEqual(ids, [self.scenario_rule_1.id, self.scenario_rule_2.id])

    def test_list_scenario_rules_unauthenticated(self):
        response = self.client.get(self.BASE_URL, {"scenario": self.scenario.id})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_scenario_rules_without_scenario_param(self):
        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.get(self.BASE_URL)  # missing scenario param
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("scenario", response.data)
        self.assertIn("This field is required.", response.data["scenario"][0])

    def test_retrieve_scenario_rule(self):
        """
        This endpoint is available to all authenticated users, regardless of permissions.
        """
        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.get(f"{self.BASE_URL}{self.scenario_rule_1.id}/")
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertEqual(result["id"], self.scenario_rule_1.id)

        self.client.force_authenticate(user=self.user_with_basic_perm)
        response = self.client.get(f"{self.BASE_URL}{self.scenario_rule_1.id}/")
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertEqual(result["id"], self.scenario_rule_1.id)

        self.client.force_authenticate(user=self.user_no_perm)
        response = self.client.get(f"{self.BASE_URL}{self.scenario_rule_1.id}/")
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertEqual(result["id"], self.scenario_rule_1.id)

    def test_retrieve_scenario_rule_unauthenticated(self):
        response = self.client.get(f"{self.BASE_URL}{self.scenario_rule_1.id}/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_retrieve_scenario_rule_from_another_account(self):
        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.get(f"{self.BASE_URL}{self.other_scenario_rule.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_post_scenario_rule_not_allowed(self):
        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.post(self.BASE_URL, {"name": "New Rule"})
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_put_scenario_rule_not_allowed(self):
        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.put(f"{self.BASE_URL}{self.scenario_rule_1.id}/", {"name": "Updated Rule"})
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_patch_scenario_rule_not_allowed(self):
        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.patch(f"{self.BASE_URL}{self.scenario_rule_1.id}/", {"name": "Updated Rule"})
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_delete_scenario_rule_not_allowed(self):
        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.delete(f"{self.BASE_URL}{self.scenario_rule_1.id}/")
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
