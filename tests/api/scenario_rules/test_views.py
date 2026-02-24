from decimal import Decimal

from rest_framework import status

from iaso.utils.colors import DEFAULT_COLOR
from plugins.snt_malaria.models import Scenario, ScenarioRule
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

    def test_post_scenario_rule_with_full_perm_own_scenario(self):
        payload = {
            "name": "New Rule",
            "scenario": self.scenario.id,
            "matching_criteria": {
                "and": [{">=": [{"var": self.metric_type_population.id}, 1]}]
            },  # all districts with population >= 1
            "intervention_properties": [
                {
                    "intervention": self.intervention_chemo_iptp.id,
                    "coverage": 0.5,
                },
                {
                    "intervention": self.intervention_vaccination_rts.id,
                    "coverage": 0.8,
                },
            ],
            "org_units_excluded": [self.district_2.id],
        }
        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.post(self.BASE_URL, payload)
        result = self.assertJSONResponse(response, status.HTTP_201_CREATED)

        self.assertIsNotNone(result["id"])
        new_rule = ScenarioRule.objects.get(id=result["id"])

        self.assertEqual(new_rule.name, payload["name"])
        self.assertEqual(new_rule.scenario_id, payload["scenario"])
        self.assertEqual(new_rule.color, DEFAULT_COLOR)
        self.assertEqual(new_rule.priority, 3)  # 2 rules in setup
        self.assertCountEqual(new_rule.org_units_matched, [self.district_1.id, self.district_2.id, self.district_3.id])
        self.assertEqual(new_rule.org_units_excluded, [self.district_2.id])
        self.assertEqual(new_rule.org_units_included, [])
        self.assertEqual(new_rule.org_units_scope, [])
        self.assertEqual(new_rule.created_by, self.user_with_full_perm)
        self.assertIsNone(new_rule.updated_by)

    def test_post_scenario_rule_with_full_perm_other_scenario(self):
        new_scenario = Scenario.objects.create(
            account=self.account,
            created_by=self.user_with_basic_perm,
            name="Other Scenario",
            description="Description of other scenario - belongs to another user",
            start_year=2020,
            end_year=2030,
        )
        payload = {
            "name": "New Rule",
            "scenario": new_scenario.id,
            "matching_criteria": {
                "and": [{">=": [{"var": self.metric_type_population.id}, 1]}]
            },  # all districts with population >= 1
            "intervention_properties": [
                {
                    "intervention": self.intervention_chemo_iptp.id,
                    "coverage": 0.5,
                },
                {
                    "intervention": self.intervention_vaccination_rts.id,
                    "coverage": 0.8,
                },
            ],
        }
        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.post(self.BASE_URL, payload)
        result = self.assertJSONResponse(response, status.HTTP_201_CREATED)

        self.assertIsNotNone(result["id"])
        new_rule = ScenarioRule.objects.get(id=result["id"])

        self.assertEqual(new_rule.name, payload["name"])
        self.assertEqual(new_rule.scenario_id, payload["scenario"])
        self.assertEqual(new_rule.color, DEFAULT_COLOR)
        self.assertEqual(new_rule.priority, 1)  # because it's a new scenario
        self.assertCountEqual(new_rule.org_units_matched, [self.district_1.id, self.district_2.id, self.district_3.id])
        self.assertEqual(new_rule.org_units_excluded, [])
        self.assertEqual(new_rule.org_units_included, [])
        self.assertEqual(new_rule.org_units_scope, [])
        self.assertEqual(new_rule.created_by, self.user_with_full_perm)
        self.assertIsNone(new_rule.updated_by)

    def test_post_scenario_rule_with_basic_perm_own_scenario(self):
        new_scenario = Scenario.objects.create(
            account=self.account,
            created_by=self.user_with_basic_perm,
            name="Other Scenario",
            description="Description of other scenario - belongs to another user",
            start_year=2020,
            end_year=2030,
        )
        payload = {
            "name": "New Rule",
            "scenario": new_scenario.id,
            "matching_criteria": {
                "and": [{">=": [{"var": self.metric_type_population.id}, 1]}]
            },  # all districts with population >= 1
            "intervention_properties": [
                {
                    "intervention": self.intervention_chemo_iptp.id,
                    "coverage": 0.5,
                },
                {
                    "intervention": self.intervention_vaccination_rts.id,
                    "coverage": 0.8,
                },
            ],
        }
        self.client.force_authenticate(user=self.user_with_basic_perm)
        response = self.client.post(self.BASE_URL, payload)
        result = self.assertJSONResponse(response, status.HTTP_201_CREATED)

        self.assertIsNotNone(result["id"])
        new_rule = ScenarioRule.objects.get(id=result["id"])

        self.assertEqual(new_rule.name, payload["name"])
        self.assertEqual(new_rule.scenario_id, payload["scenario"])
        self.assertEqual(new_rule.color, DEFAULT_COLOR)
        self.assertEqual(new_rule.priority, 1)  # because it's a new scenario
        self.assertCountEqual(new_rule.org_units_matched, [self.district_1.id, self.district_2.id, self.district_3.id])
        self.assertEqual(new_rule.org_units_excluded, [])
        self.assertEqual(new_rule.org_units_included, [])
        self.assertEqual(new_rule.org_units_scope, [])
        self.assertEqual(new_rule.created_by, self.user_with_basic_perm)
        self.assertIsNone(new_rule.updated_by)

    def test_post_scenario_rule_with_basic_perm_other_scenario(self):
        payload = {
            "name": "New Rule",
            "scenario": self.scenario.id,
            "matching_criteria": {
                "and": [{">=": [{"var": self.metric_type_population.id}, 1]}]
            },  # all districts with population >= 1
            "intervention_properties": [
                {
                    "intervention": self.intervention_chemo_iptp.id,
                    "coverage": 0.5,
                }
            ],
        }
        self.client.force_authenticate(user=self.user_with_basic_perm)
        response = self.client.post(self.BASE_URL, payload)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_post_scenario_rule_with_no_perm(self):
        payload = {
            "name": "New Rule",
            "scenario": self.scenario.id,
            "matching_criteria": {
                "and": [{">=": [{"var": self.metric_type_population.id}, 1]}]
            },  # all districts with population >= 1
            "intervention_properties": [
                {
                    "intervention": self.intervention_chemo_iptp.id,
                    "coverage": 0.5,
                }
            ],
        }
        self.client.force_authenticate(user=self.user_no_perm)
        response = self.client.post(self.BASE_URL, payload)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_post_scenario_rule_unauthenticated(self):
        payload = {
            "name": "New Rule",
            "scenario": self.scenario.id,
            "matching_criteria": {
                "and": [{">=": [{"var": self.metric_type_population.id}, 1]}]
            },  # all districts with population >= 1
            "intervention_properties": [
                {
                    "intervention": self.intervention_chemo_iptp.id,
                    "coverage": 0.5,
                }
            ],
        }
        response = self.client.post(self.BASE_URL, payload)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_post_scenario_rule_with_district_filtering_from_matching_criteria(self):
        payload = {
            "name": "New Rule",
            "scenario": self.scenario.id,
            "matching_criteria": {
                "and": [
                    {">=": [{"var": self.metric_type_population.id}, self.metric_value_district_2_pop.value]}
                ]  # district_1 has a lower population, so it should not be matched
            },
            "intervention_properties": [
                {
                    "intervention": self.intervention_chemo_iptp.id,
                    "coverage": 0.5,
                }
            ],
            "org_units_excluded": [self.district_3.id],
            "org_units_included": [self.district_1.id],
            "org_units_scope": [self.district_1.id, self.district_2.id, self.district_3.id],
        }
        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.post(self.BASE_URL, payload)
        result = self.assertJSONResponse(response, status.HTTP_201_CREATED)

        self.assertIsNotNone(result["id"])
        new_rule = ScenarioRule.objects.get(id=result["id"])

        # district 1 should not appear because its population is lower (self.metric_value_district_1_pop.value)
        self.assertCountEqual(new_rule.org_units_matched, [self.district_2.id, self.district_3.id])

        # these 3 simply store the passed parameters
        self.assertCountEqual(new_rule.org_units_excluded, [self.district_3.id])
        self.assertCountEqual(new_rule.org_units_included, [self.district_1.id])
        self.assertCountEqual(new_rule.org_units_scope, [self.district_1.id, self.district_2.id, self.district_3.id])

    def test_put_scenario_rule_not_allowed(self):
        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.put(f"{self.BASE_URL}{self.scenario_rule_1.id}/", {"name": "Updated Rule"})
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_patch_scenario_rule_with_full_perm_own_scenario(self):
        payload = {
            "name": "Updated Rule",
            "color": "#000000",
            "matching_criteria": {
                "and": [{">=": [{"var": self.metric_type_pop_under_5.id}, 1]}]
            },  # all districts with population <5 years old >= 1
            "intervention_properties": [
                {
                    "intervention": self.intervention_chemo_iptp.id,
                    "coverage": 0.5,
                }  # dropping one intervention from setup
            ],
            "org_units_included": [],  # removing all org units from setup
        }
        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.patch(f"{self.BASE_URL}{self.scenario_rule_1.id}/", payload)
        self.assertJSONResponse(response, status.HTTP_200_OK)

        self.scenario_rule_1.refresh_from_db()
        # checking simple attributes
        self.assertEqual(self.scenario_rule_1.name, payload["name"])
        self.assertEqual(self.scenario_rule_1.color, payload["color"])
        self.assertEqual(self.scenario_rule_1.matching_criteria, payload["matching_criteria"])
        self.assertEqual(self.scenario_rule_1.org_units_included, payload["org_units_included"])

        # checking intervention properties
        intervention_properties = self.scenario_rule_1.intervention_properties.all()
        self.assertEqual(len(intervention_properties), 1)  # one was removed
        self.assertEqual(intervention_properties[0].intervention_id, self.intervention_chemo_iptp.id)
        self.assertEqual(intervention_properties[0].coverage, Decimal("0.5"))

        # checking values set by the view
        self.assertCountEqual(
            self.scenario_rule_1.org_units_matched, [self.district_1.id, self.district_2.id, self.district_3.id]
        )
        self.assertEqual(self.scenario_rule_1.updated_by, self.user_with_full_perm)

        # other values never change
        self.assertEqual(self.scenario_rule_1.scenario, self.scenario)
        self.assertEqual(self.scenario_rule_1.priority, 1)

    def test_patch_scenario_rule_with_full_perm_other_scenario(self):
        new_scenario = Scenario.objects.create(
            account=self.account,
            created_by=self.user_with_basic_perm,
            name="Other Scenario",
            description="Description of other scenario - belongs to another user",
            start_year=2020,
            end_year=2030,
        )
        new_rule = ScenarioRule.objects.create(
            scenario=new_scenario,
            created_by=self.user_with_basic_perm,
            updated_by=self.user_with_basic_perm,
            name="Other Scenario Rule",
            matching_criteria={"and": [{">=": [{"var": self.metric_type_population.id}, 1]}]},
            org_units_matched=[self.district_1.id, self.district_2.id, self.district_3.id],
            priority=1,
        )

        payload = {
            "name": "New name",
        }
        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.patch(f"{self.BASE_URL}{new_rule.id}/", payload)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        new_rule.refresh_from_db()
        self.assertEqual(new_rule.name, payload["name"])
        self.assertEqual(new_rule.updated_by, self.user_with_full_perm)
        # TODO: once assignments are implemented, make sure that this does not delete any existing assignments

    def test_patch_scenario_rule_with_basic_perm_own_scenario(self):
        new_scenario = Scenario.objects.create(
            account=self.account,
            created_by=self.user_with_basic_perm,
            name="Other Scenario",
            description="Description of other scenario - belongs to another user",
            start_year=2020,
            end_year=2030,
        )
        new_rule = ScenarioRule.objects.create(
            scenario=new_scenario,
            created_by=self.user_with_basic_perm,
            name="Other Scenario Rule",
            matching_criteria={"and": [{">=": [{"var": self.metric_type_population.id}, 1]}]},
            priority=1,
        )

        payload = {
            "name": "New name",
            "color": "#000000",
            "matching_criteria": {
                "and": [{">=": [{"var": self.metric_type_pop_under_5.id}, 1]}]
            },  # all districts with population <5 years old >= 1
            "intervention_properties": [
                {
                    "intervention": self.intervention_chemo_iptp.id,
                    "coverage": 0.5,
                },
            ],
        }

        self.client.force_authenticate(user=self.user_with_basic_perm)
        response = self.client.patch(f"{self.BASE_URL}{new_rule.id}/", payload)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        new_rule.refresh_from_db()
        self.assertEqual(new_rule.name, payload["name"])
        self.assertEqual(new_rule.color, payload["color"])
        self.assertEqual(new_rule.matching_criteria, payload["matching_criteria"])
        self.assertEqual(new_rule.updated_by, self.user_with_basic_perm)
        self.assertCountEqual(new_rule.org_units_matched, [self.district_1.id, self.district_2.id, self.district_3.id])

        intervention_properties = new_rule.intervention_properties.all()
        self.assertEqual(len(intervention_properties), 1)
        self.assertEqual(intervention_properties[0].intervention_id, self.intervention_chemo_iptp.id)
        self.assertEqual(intervention_properties[0].coverage, Decimal("0.5"))

    def test_patch_scenario_rule_with_basic_perm_other_scenario(self):
        payload = {
            "name": "Updated Rule",
        }
        self.client.force_authenticate(user=self.user_with_basic_perm)
        response = self.client.patch(f"{self.BASE_URL}{self.scenario_rule_1.id}/", payload)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_patch_scenario_rule_with_no_perm(self):
        payload = {
            "name": "Updated Rule",
        }
        self.client.force_authenticate(user=self.user_no_perm)
        response = self.client.patch(f"{self.BASE_URL}{self.scenario_rule_1.id}/", payload)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_patch_scenario_rule_unauthenticated(self):
        payload = {
            "name": "Updated Rule",
        }
        response = self.client.patch(f"{self.BASE_URL}{self.scenario_rule_1.id}/", payload)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_patch_scenario_rule_unknown_rule_id(self):
        unknown_rule_id = 1234567890
        payload = {
            "name": "Updated Rule",
        }
        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.patch(f"{self.BASE_URL}{unknown_rule_id}/", payload)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_patch_scenario_rule_from_another_account(self):
        payload = {
            "name": "Updated Rule",
        }
        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.patch(f"{self.BASE_URL}{self.other_scenario_rule.id}/", payload)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_scenario_rule_not_allowed(self):
        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.delete(f"{self.BASE_URL}{self.scenario_rule_1.id}/")
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
