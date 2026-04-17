from decimal import Decimal

from rest_framework import status

from iaso.utils.colors import DEFAULT_COLOR
from plugins.snt_malaria.models import InterventionAssignment, Scenario, ScenarioRule
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

    def test_list_locked_scenario_rules(self):
        self.scenario.is_locked = True
        self.scenario.save()

        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.get(self.BASE_URL, {"scenario": self.scenario.id})
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertEqual(len(result), 2)

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

    def test_retrieve_scenario_rule_locked_scenario(self):
        self.scenario.is_locked = True
        self.scenario.save()

        self.client.force_authenticate(user=self.user_with_full_perm)
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

    def test_post_scenario_rule_for_locked_scenario(self):
        self.scenario.is_locked = True
        self.scenario.save()

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
        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.post(self.BASE_URL, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("scenario", response.data)
        self.assertIn("Cannot add rules to a locked scenario", response.data["scenario"][0])

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

    def test_patch_scenario_rule_for_locked_scenario(self):
        self.scenario.is_locked = True
        self.scenario.save()

        payload = {
            "name": "Updated Rule",
        }
        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.patch(f"{self.BASE_URL}{self.scenario_rule_1.id}/", payload)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("You do not have permission to perform this action.", response.data["detail"])

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

    def test_patch_only_some_fields(self):
        # making sure that all optional fields have set values
        self.scenario_rule_1.org_units_included = [self.district_1.id]
        self.scenario_rule_1.org_units_scope = [self.district_1.id, self.district_2.id, self.district_3.id]
        self.scenario_rule_1.save()

        color_before = self.scenario_rule_1.color
        priority_before = self.scenario_rule_1.priority
        matching_criteria_before = self.scenario_rule_1.matching_criteria
        created_by_before = self.scenario_rule_1.created_by
        org_units_matched_before = self.scenario_rule_1.org_units_matched
        org_units_excluded_before = self.scenario_rule_1.org_units_excluded
        org_units_included_before = self.scenario_rule_1.org_units_included
        org_units_scope_before = self.scenario_rule_1.org_units_scope
        intervention_properties_ids_before = list(
            self.scenario_rule_1.intervention_properties.values_list("id", flat=True)
        )

        payload = {
            "name": "Updated Rule",  # not changing any other field
        }
        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.patch(f"{self.BASE_URL}{self.scenario_rule_1.id}/", payload)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.scenario_rule_1.refresh_from_db()
        self.assertEqual(self.scenario_rule_1.name, payload["name"])
        self.assertEqual(self.scenario_rule_1.updated_by, self.user_with_full_perm)

        # checking that all other fields are unchanged
        self.assertEqual(self.scenario_rule_1.color, color_before)
        self.assertEqual(self.scenario_rule_1.priority, priority_before)
        self.assertEqual(self.scenario_rule_1.matching_criteria, matching_criteria_before)
        self.assertEqual(self.scenario_rule_1.created_by, created_by_before)
        self.assertEqual(self.scenario_rule_1.org_units_matched, org_units_matched_before)
        self.assertEqual(self.scenario_rule_1.org_units_excluded, org_units_excluded_before)
        self.assertEqual(self.scenario_rule_1.org_units_included, org_units_included_before)
        self.assertEqual(self.scenario_rule_1.org_units_scope, org_units_scope_before)
        self.assertCountEqual(
            self.scenario_rule_1.intervention_properties.values_list("id", flat=True),
            intervention_properties_ids_before,
        )

    def test_delete_scenario_rule_with_full_perm_own_scenario(self):
        self.assertEqual(self.scenario.rules.count(), 2)

        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.delete(f"{self.BASE_URL}{self.scenario_rule_1.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        self.assertEqual(self.scenario.rules.count(), 1)
        with self.assertRaises(ScenarioRule.DoesNotExist):
            ScenarioRule.objects.get(id=self.scenario_rule_1.id)

    def test_delete_scenario_rule_for_locked_scenario(self):
        self.scenario.is_locked = True
        self.scenario.save()

        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.delete(f"{self.BASE_URL}{self.scenario_rule_1.id}/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("You do not have permission to perform this action.", response.data["detail"])
        self.assertEqual(self.scenario.rules.count(), 2)  # rule should not be deleted
        self.assertIsNotNone(ScenarioRule.objects.get(id=self.scenario_rule_1.id))  # rule should still exist

    def test_delete_scenario_rule_with_full_perm_other_scenario(self):
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
            org_units_matched=[self.district_1.id, self.district_2.id, self.district_3.id],
            priority=1,
        )

        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.delete(f"{self.BASE_URL}{new_rule.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        self.assertEqual(new_scenario.rules.count(), 0)
        with self.assertRaises(ScenarioRule.DoesNotExist):
            ScenarioRule.objects.get(id=new_rule.id)

        assignments = InterventionAssignment.objects.filter(rule_id=new_rule.id)
        self.assertEqual(assignments.count(), 0)  # all related assignments should be deleted

    def test_delete_scenario_rule_with_basic_perm_own_scenario(self):
        new_scenario = Scenario.objects.create(
            account=self.account,
            created_by=self.user_with_basic_perm,
            name="Other Scenario",
            description="Description of other scenario",
            start_year=2020,
            end_year=2030,
        )
        new_rule = ScenarioRule.objects.create(
            scenario=new_scenario,
            created_by=self.user_with_basic_perm,
            name="Other Scenario Rule",
            matching_criteria={"and": [{">=": [{"var": self.metric_type_population.id}, 1]}]},
            org_units_matched=[self.district_1.id, self.district_2.id, self.district_3.id],
            priority=1,
        )

        self.client.force_authenticate(user=self.user_with_basic_perm)
        response = self.client.delete(f"{self.BASE_URL}{new_rule.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        self.assertEqual(new_scenario.rules.count(), 0)
        with self.assertRaises(ScenarioRule.DoesNotExist):
            ScenarioRule.objects.get(id=new_rule.id)

        assignments = InterventionAssignment.objects.filter(rule_id=new_rule.id)
        self.assertEqual(assignments.count(), 0)  # all related assignments should be deleted

    def test_delete_scenario_rule_with_basic_perm_other_scenario(self):
        self.client.force_authenticate(user=self.user_with_basic_perm)
        response = self.client.delete(f"{self.BASE_URL}{self.scenario_rule_1.id}/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_scenario_rule_with_no_perm(self):
        self.client.force_authenticate(user=self.user_no_perm)
        response = self.client.delete(f"{self.BASE_URL}{self.scenario_rule_1.id}/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_scenario_rule_unauthenticated(self):
        response = self.client.delete(f"{self.BASE_URL}{self.scenario_rule_1.id}/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_delete_scenario_rule_unknown_rule_id(self):
        unknown_rule_id = 1234567890
        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.delete(f"{self.BASE_URL}{unknown_rule_id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_scenario_rule_from_another_account(self):
        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.delete(f"{self.BASE_URL}{self.other_scenario_rule.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_preview_scenario_rule_unauthenticated(self):
        payload = {
            "matching_criteria": {"and": [{">=": [{"var": self.metric_type_population.id}, 13000000]}]},
        }
        response = self.client.post(f"{self.BASE_URL}preview/", payload)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_preview_scenario_rule_with_no_perm(self):
        payload = {
            "matching_criteria": {"and": [{">=": [{"var": self.metric_type_population.id}, 13000000]}]},
        }
        self.client.force_authenticate(user=self.user_no_perm)
        response = self.client.post(f"{self.BASE_URL}preview/", payload)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_preview_scenario_rule_with_basic_perm(self):
        payload = {
            "matching_criteria": {"and": [{">=": [{"var": self.metric_type_population.id}, 13000000]}]},
        }
        self.client.force_authenticate(user=self.user_with_basic_perm)
        response = self.client.post(f"{self.BASE_URL}preview/", payload)
        result = self.assertJSONResponse(response, status.HTTP_200_OK)

        self.assertEqual(len(result), 2)
        self.assertNotIn(self.district_1.id, result)
        self.assertIn(self.district_2.id, result)
        self.assertIn(self.district_3.id, result)

    def test_preview_scenario_rule_with_full_perm_other_scenario(self):
        payload = {
            "matching_criteria": {"and": [{">=": [{"var": self.metric_type_population.id}, 13000000]}]},
        }
        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.post(f"{self.BASE_URL}preview/", payload)
        result = self.assertJSONResponse(response, status.HTTP_200_OK)

        self.assertEqual(len(result), 2)
        self.assertNotIn(self.district_1.id, result)
        self.assertIn(self.district_2.id, result)
        self.assertIn(self.district_3.id, result)

    def test_preview_scenario_rule_withbasic_perm_other_scenario(self):
        payload = {
            "matching_criteria": {"and": [{">=": [{"var": self.metric_type_population.id}, 13000000]}]},
        }
        self.client.force_authenticate(user=self.user_with_basic_perm)
        response = self.client.post(f"{self.BASE_URL}preview/", payload)
        result = self.assertJSONResponse(response, status.HTTP_200_OK)

        self.assertEqual(len(result), 2)
        self.assertNotIn(self.district_1.id, result)
        self.assertIn(self.district_2.id, result)
        self.assertIn(self.district_3.id, result)

    def test_preview_scenario_rule_with_full_perm_own_scenario(self):
        payload = {
            "matching_criteria": {"and": [{">=": [{"var": self.metric_type_population.id}, 13000000]}]},
        }
        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.post(f"{self.BASE_URL}preview/", payload)
        result = self.assertJSONResponse(response, status.HTTP_200_OK)

        self.assertEqual(len(result), 2)
        self.assertNotIn(self.district_1.id, result)
        self.assertIn(self.district_2.id, result)
        self.assertIn(self.district_3.id, result)

    def test_preview_scenario_rule_with_inclusion(self):
        payload = {
            "matching_criteria": {"and": [{">=": [{"var": self.metric_type_population.id}, 13000000]}]},
            "org_units_included": [self.district_1.id],
        }
        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.post(f"{self.BASE_URL}preview/", payload)
        result = self.assertJSONResponse(response, status.HTTP_200_OK)

        self.assertEqual(len(result), 3)
        self.assertIn(self.district_1.id, result)
        self.assertIn(self.district_2.id, result)
        self.assertIn(self.district_3.id, result)

    def test_preview_scenario_rule_with_exclusion(self):
        payload = {
            "matching_criteria": {"and": [{">=": [{"var": self.metric_type_population.id}, 13000000]}]},
            "org_units_excluded": [self.district_3.id],  # district_1 meets the criteria but should be excluded anyway
        }
        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.post(f"{self.BASE_URL}preview/", payload)
        result = self.assertJSONResponse(response, status.HTTP_200_OK)

        self.assertEqual(len(result), 1)
        self.assertNotIn(self.district_1.id, result)
        self.assertIn(self.district_2.id, result)
        self.assertNotIn(self.district_3.id, result)

    def test_preview_scenario_rule_with_exclusion_and_inclusion(self):
        payload = {
            "matching_criteria": {"and": [{">=": [{"var": self.metric_type_population.id}, 13000000]}]},
            "org_units_excluded": [self.district_3.id],
            "org_units_included": [self.district_1.id],
        }
        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.post(f"{self.BASE_URL}preview/", payload)
        result = self.assertJSONResponse(response, status.HTTP_200_OK)

        self.assertEqual(len(result), 2)
        self.assertIn(self.district_1.id, result)
        self.assertIn(self.district_2.id, result)
        self.assertNotIn(self.district_3.id, result)

    def test_post_scenario_rule_match_all(self):
        payload = {
            "name": "Match all rule",
            "scenario": self.scenario.id,
            "matching_criteria": {"all": True},
            "intervention_properties": [
                {"intervention": self.intervention_vaccination_rts.id, "coverage": 0.80},
            ],
        }
        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.post(self.BASE_URL, payload)
        result = self.assertJSONResponse(response, status.HTTP_201_CREATED)

        new_rule = ScenarioRule.objects.get(id=result["id"])
        self.assertEqual(new_rule.matching_criteria, {"all": True})
        self.assertCountEqual(
            new_rule.org_units_matched,
            [self.district_1.id, self.district_2.id, self.district_3.id],
        )

    def test_post_scenario_rule_inclusion_only(self):
        payload = {
            "name": "Inclusion-only rule",
            "scenario": self.scenario.id,
            "matching_criteria": None,
            "intervention_properties": [
                {"intervention": self.intervention_vaccination_rts.id, "coverage": 0.80},
            ],
            "org_units_included": [self.district_1.id],
        }
        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.post(self.BASE_URL, payload)
        result = self.assertJSONResponse(response, status.HTTP_201_CREATED)

        new_rule = ScenarioRule.objects.get(id=result["id"])
        self.assertIsNone(new_rule.matching_criteria)
        self.assertEqual(new_rule.org_units_matched, [])

    def test_preview_match_all(self):
        payload = {"matching_criteria": {"all": True}}
        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.post(f"{self.BASE_URL}preview/", payload)
        result = self.assertJSONResponse(response, status.HTTP_200_OK)

        self.assertEqual(len(result), 3)
        self.assertIn(self.district_1.id, result)
        self.assertIn(self.district_2.id, result)
        self.assertIn(self.district_3.id, result)

    def test_preview_match_all_with_exclusion(self):
        payload = {
            "matching_criteria": {"all": True},
            "org_units_excluded": [self.district_2.id],
        }
        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.post(f"{self.BASE_URL}preview/", payload)
        result = self.assertJSONResponse(response, status.HTTP_200_OK)

        self.assertEqual(len(result), 2)
        self.assertIn(self.district_1.id, result)
        self.assertNotIn(self.district_2.id, result)
        self.assertIn(self.district_3.id, result)

    def test_preview_inclusion_only_rule(self):
        payload = {
            "matching_criteria": None,
            "org_units_included": [self.district_1.id],
        }
        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.post(f"{self.BASE_URL}preview/", payload)
        result = self.assertJSONResponse(response, status.HTTP_200_OK)

        self.assertEqual(len(result), 1)
        self.assertIn(self.district_1.id, result)

    def test_patch_to_match_all(self):
        payload = {"matching_criteria": {"all": True}}
        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.patch(f"{self.BASE_URL}{self.scenario_rule_1.id}/", payload)
        self.assertJSONResponse(response, status.HTTP_200_OK)

        self.scenario_rule_1.refresh_from_db()
        self.assertEqual(self.scenario_rule_1.matching_criteria, {"all": True})
        self.assertCountEqual(
            self.scenario_rule_1.org_units_matched,
            [self.district_1.id, self.district_2.id, self.district_3.id],
        )
