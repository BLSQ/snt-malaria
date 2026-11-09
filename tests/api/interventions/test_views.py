from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework import status

from plugins.snt_malaria.api.interventions.permissions import (
    SNT_SETTINGS_READ_PERMISSION,
    SNT_SETTINGS_WRITE_PERMISSION,
)
from plugins.snt_malaria.models import (
    Donor,
    Grant,
    Intervention,
    ScenarioRule,
    ScenarioRuleCostOverride,
    ScenarioRuleIntervention,
)
from plugins.snt_malaria.models.cost_unit_type import CostUnitType
from plugins.snt_malaria.tests.common_base import SNTMalariaAPITestCase


BASE_URL = "/api/snt_malaria/interventions/"


class InterventionAPITests(SNTMalariaAPITestCase):
    auto_create_account = False

    def setUp(self):
        super().setUp()
        self.account, _ = self.create_snt_account(name="Test Account 3")
        self.user_write, self.anon, self.user_no_perm = self.create_base_users(
            self.account, [SNT_SETTINGS_WRITE_PERMISSION], "admin"
        )
        self.user_read = self.create_user_with_profile(
            username="user_read", account=self.account, permissions=[SNT_SETTINGS_READ_PERMISSION]
        )

        defaults = self.create_snt_default_interventions(account=self.account, created_by=self.user_write)
        self.int_category_vaccination = defaults["category_vaccination"]
        self.int_category_chemoprevention = defaults["category_chemoprevention"]
        self.intervention_vaccination_rts = defaults["intervention_rts"]
        self.intervention_chemo_smc = defaults["intervention_smc"]
        self.intervention_chemo_iptp = defaults["intervention_iptp"]
        self.unit_type_other, _ = CostUnitType.objects.get_or_create(account=self.account, name="Other")
        self.unit_type_per_itn, _ = CostUnitType.objects.get_or_create(account=self.account, name="per ITN")

        self.cost_line = self.intervention_vaccination_rts.cost_breakdown_lines.create(
            name="Cost Line 1",
            unit_cost=10,
            category="Procurement",
            unit_type=self.unit_type_other,
            created_by=self.user_write,
        )

    def test_list_interventions_authenticated(self):
        self.client.force_authenticate(user=self.user_write)
        response = self.client.get(BASE_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 4)
        rts_intervention = next(
            (item for item in response.data if item["id"] == self.intervention_vaccination_rts.id), None
        )
        self.assertIsNotNone(rts_intervention)

    def test_list_interventions_insufficient_permissions(self):
        self.client.force_authenticate(user=self.user_no_perm)
        response = self.client.get(BASE_URL)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_interventions_read_permission(self):
        self.client.force_authenticate(user=self.user_read)
        response = self.client.get(BASE_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 4)
        rts_intervention = next(
            (item for item in response.data if item["id"] == self.intervention_vaccination_rts.id), None
        )
        self.assertIsNotNone(rts_intervention)

    def test_list_intervention_unauthenticated(self):
        response = self.client.get(BASE_URL)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_retrieve_intervention_details(self):
        self.client.force_authenticate(user=self.user_write)
        url = f"{BASE_URL}{self.intervention_vaccination_rts.id}/details/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.intervention_vaccination_rts.id)
        self.assertEqual(response.data["name"], self.intervention_vaccination_rts.name)
        self.assertEqual(response.data["impact_ref"], self.intervention_vaccination_rts.impact_ref)
        self.assertIn("cost_breakdown_lines", response.data)

    def test_retrieve_intervention_details_lists_cost_lines_by_id_without_per_line_queries(self):
        self.client.force_authenticate(user=self.user_write)
        url = f"{BASE_URL}{self.intervention_vaccination_rts.id}/details/"
        self.client.get(url)  # warms the per-user caches so both measurements compare the same work
        with CaptureQueriesContext(connection) as single_line_queries:
            self.client.get(url)

        extra_lines = [
            self.intervention_vaccination_rts.cost_breakdown_lines.create(
                name=f"Extra line {index}",
                unit_cost=1,
                category="Operational",
                unit_type=self.unit_type_per_itn,
                created_by=self.user_write,
            )
            for index in range(2)
        ]
        with CaptureQueriesContext(connection) as three_lines_queries:
            response = self.client.get(url)

        self.assertEqual(len(three_lines_queries), len(single_line_queries))
        self.assertEqual(
            [line["id"] for line in response.data["cost_breakdown_lines"]],
            [self.cost_line.id] + [line.id for line in extra_lines],
        )

    def test_update_intervention_details_returns_saved_cost_lines(self):
        self.client.force_authenticate(user=self.user_write)
        url = f"{BASE_URL}{self.intervention_vaccination_rts.id}/update_details/"
        response = self.client.put(
            url,
            {
                "cost_breakdown_lines": [
                    {
                        "id": self.cost_line.id,
                        "intervention": self.intervention_vaccination_rts.id,
                        "name": "Renamed line",
                        "unit_cost": "10.00",
                        "category": "Procurement",
                        "unit_type": self.unit_type_per_itn.id,
                    }
                ]
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        [line] = response.data["cost_breakdown_lines"]
        self.assertEqual(line["name"], "Renamed line")
        self.assertEqual(line["unit_type_label"], self.unit_type_per_itn.name)

    def test_retrieve_intervention_details_unauthenticated(self):
        url = f"{BASE_URL}{self.intervention_vaccination_rts.id}/details/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_retrieve_intervention_details_insufficient_permissions(self):
        self.client.force_authenticate(user=self.user_no_perm)
        url = f"{BASE_URL}{self.intervention_vaccination_rts.id}/details/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_retrieve_intervention_details_read_permission(self):
        self.client.force_authenticate(user=self.user_read)
        url = f"{BASE_URL}{self.intervention_vaccination_rts.id}/details/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.intervention_vaccination_rts.id)
        self.assertEqual(response.data["name"], self.intervention_vaccination_rts.name)
        self.assertEqual(response.data["impact_ref"], self.intervention_vaccination_rts.impact_ref)
        self.assertIn("cost_breakdown_lines", response.data)

    def test_update_intervention_details(self):
        self.client.force_authenticate(user=self.user_write)
        url = f"{BASE_URL}{self.intervention_vaccination_rts.id}/update_details/"
        data = {
            "name": "Updated RTS,S",
            "impact_ref": "updated_ref",
            "cost_breakdown_lines": [
                {
                    "name": "Updated Cost Line 1",
                    "unit_cost": 15,
                    "unit_type": self.unit_type_other.id,
                    "category": "Procurement",
                },
                {
                    "name": "New Cost Line 2",
                    "unit_cost": 20,
                    "unit_type": self.unit_type_per_itn.id,
                    "category": "Distribution",
                },
            ],
        }
        response = self.client.put(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.intervention_vaccination_rts.refresh_from_db()
        self.assertEqual(self.intervention_vaccination_rts.name, data["name"])
        self.assertEqual(self.intervention_vaccination_rts.impact_ref, data["impact_ref"])
        self.assertEqual(self.intervention_vaccination_rts.cost_breakdown_lines.count(), 2)
        line_names = [line.name for line in self.intervention_vaccination_rts.cost_breakdown_lines.all()]
        self.assertIn("Updated Cost Line 1", line_names)
        self.assertIn("New Cost Line 2", line_names)

    def test_retrieve_intervention_details_includes_grant(self):
        donor = Donor.objects.create(account=self.account, name="Global Fund")
        grant = Grant.objects.create(account=self.account, donor=donor, name="NFM4")
        self.intervention_vaccination_rts.grant = grant
        self.intervention_vaccination_rts.save()

        self.client.force_authenticate(user=self.user_write)
        url = f"{BASE_URL}{self.intervention_vaccination_rts.id}/details/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["grant"], grant.id)

    def test_update_intervention_details_set_grant(self):
        donor = Donor.objects.create(account=self.account, name="Global Fund")
        grant = Grant.objects.create(account=self.account, donor=donor, name="NFM4")

        self.client.force_authenticate(user=self.user_write)
        url = f"{BASE_URL}{self.intervention_vaccination_rts.id}/update_details/"
        response = self.client.put(url, {"grant": grant.id}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["grant"], grant.id)
        self.intervention_vaccination_rts.refresh_from_db()
        self.assertEqual(self.intervention_vaccination_rts.grant, grant)

    def test_update_intervention_details_clear_grant(self):
        donor = Donor.objects.create(account=self.account, name="Global Fund")
        grant = Grant.objects.create(account=self.account, donor=donor, name="NFM4")
        self.intervention_vaccination_rts.grant = grant
        self.intervention_vaccination_rts.save()

        self.client.force_authenticate(user=self.user_write)
        url = f"{BASE_URL}{self.intervention_vaccination_rts.id}/update_details/"
        response = self.client.put(url, {"grant": None}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data["grant"])
        self.intervention_vaccination_rts.refresh_from_db()
        self.assertIsNone(self.intervention_vaccination_rts.grant)

    def test_update_intervention_details_with_other_account_grant_returns_400(self):
        other_account, _ = self.create_snt_account(name="Other Account For Grants")
        other_donor = Donor.objects.create(account=other_account, name="Other Donor")
        other_grant = Grant.objects.create(account=other_account, donor=other_donor, name="Other Grant")

        self.client.force_authenticate(user=self.user_write)
        url = f"{BASE_URL}{self.intervention_vaccination_rts.id}/update_details/"
        response = self.client.put(url, {"grant": other_grant.id}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.intervention_vaccination_rts.refresh_from_db()
        self.assertIsNone(self.intervention_vaccination_rts.grant)

    def test_update_intervention_details_unauthenticated(self):
        url = f"{BASE_URL}{self.intervention_vaccination_rts.id}/update_details/"
        data = {
            "name": "Updated RTS,S",
            "impact_ref": "updated_ref",
            "cost_breakdown_lines": [
                {
                    "name": "Updated Cost Line 1",
                    "unit_cost": 15,
                    "unit_type": self.unit_type_other.id,
                    "category": "Procurement",
                },
                {
                    "name": "New Cost Line 2",
                    "unit_cost": 20,
                    "unit_type": self.unit_type_per_itn.id,
                    "category": "Distribution",
                },
            ],
        }
        response = self.client.put(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_update_intervention_details_insufficient_permissions(self):
        self.client.force_authenticate(user=self.user_read)
        url = f"{BASE_URL}{self.intervention_vaccination_rts.id}/update_details/"
        data = {
            "name": "Updated RTS,S",
            "impact_ref": "updated_ref",
            "cost_breakdown_lines": [
                {
                    "name": "Updated Cost Line 1",
                    "unit_cost": 15,
                    "unit_type": self.unit_type_other.id,
                    "category": "Procurement",
                },
                {
                    "name": "New Cost Line 2",
                    "unit_cost": 20,
                    "unit_type": self.unit_type_per_itn.id,
                    "category": "Distribution",
                },
            ],
        }
        response = self.client.put(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # Create

    def test_create_intervention_with_write_perm(self):
        self.client.force_authenticate(user=self.user_write)
        data = {
            "name": "New intervention",
            "short_name": "NI",
            "code": "new_intervention",
            "description": "A new intervention",
            "intervention_category": self.int_category_vaccination.id,
        }
        response = self.client.post(BASE_URL, data=data)
        result = self.assertJSONResponse(response, status.HTTP_201_CREATED)
        self.assertEqual(result["name"], "New intervention")
        created = Intervention.objects.get(id=result["id"])
        self.assertEqual(created.intervention_category, self.int_category_vaccination)
        self.assertEqual(created.created_by, self.user_write)

    def test_create_intervention_duplicate_name_in_category_returns_400(self):
        self.client.force_authenticate(user=self.user_write)
        data = {
            "name": self.intervention_vaccination_rts.name,
            "code": "duplicate",
            "intervention_category": self.int_category_vaccination.id,
        }
        response = self.client.post(BASE_URL, data=data)
        self.assertJSONResponse(response, status.HTTP_400_BAD_REQUEST)

    def test_create_intervention_with_other_account_category_returns_400(self):
        other_account, _ = self.create_snt_account(name="Other Account For Interventions")
        other_category = self.create_snt_intervention_category(account=other_account, created_by=self.user_write)

        self.client.force_authenticate(user=self.user_write)
        data = {"name": "Sneaky intervention", "code": "sneaky", "intervention_category": other_category.id}
        response = self.client.post(BASE_URL, data=data)
        self.assertJSONResponse(response, status.HTTP_400_BAD_REQUEST)

    def test_create_intervention_with_read_perm_forbidden(self):
        self.client.force_authenticate(user=self.user_read)
        data = {
            "name": "New intervention",
            "code": "new_intervention",
            "intervention_category": self.int_category_vaccination.id,
        }
        response = self.client.post(BASE_URL, data=data)
        self.assertJSONResponse(response, status.HTTP_403_FORBIDDEN)

    def test_create_intervention_no_auth(self):
        data = {
            "name": "New intervention",
            "code": "new_intervention",
            "intervention_category": self.int_category_vaccination.id,
        }
        response = self.client.post(BASE_URL, data=data)
        self.assertJSONResponse(response, status.HTTP_401_UNAUTHORIZED)

    # Update (basic fields)

    def test_patch_intervention_basic_fields_with_write_perm(self):
        self.client.force_authenticate(user=self.user_write)
        response = self.client.patch(
            f"{BASE_URL}{self.intervention_vaccination_rts.id}/",
            data={"short_name": "Updated short name", "code": "updated_code"},
        )
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertEqual(result["short_name"], "Updated short name")
        self.intervention_vaccination_rts.refresh_from_db()
        self.assertEqual(self.intervention_vaccination_rts.code, "updated_code")

    def test_patch_intervention_with_read_perm_forbidden(self):
        self.client.force_authenticate(user=self.user_read)
        response = self.client.patch(f"{BASE_URL}{self.intervention_vaccination_rts.id}/", data={"short_name": "Nope"})
        self.assertJSONResponse(response, status.HTTP_403_FORBIDDEN)

    # Delete

    def test_delete_intervention_with_write_perm_deletes(self):
        self.client.force_authenticate(user=self.user_write)
        response = self.client.delete(f"{BASE_URL}{self.intervention_vaccination_rts.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Intervention.objects.filter(id=self.intervention_vaccination_rts.id).exists())

    def _create_scenario(self, **kwargs):
        return self.create_snt_scenario(account=self.account, created_by=self.user_write, **kwargs)

    def _create_rule(self, scenario, interventions, **kwargs):
        return self.create_snt_rule(scenario, interventions, created_by=self.user_write, **kwargs)

    def _create_deleted_scenario_rule(self, interventions):
        scenario = self._create_scenario()
        rule = self._create_rule(scenario, interventions)
        scenario.delete()
        return rule

    def test_delete_intervention_used_by_a_rule_returns_405(self):
        self._create_rule(self._create_scenario(), [self.intervention_vaccination_rts])

        self.client.force_authenticate(user=self.user_write)
        response = self.client.delete(f"{BASE_URL}{self.intervention_vaccination_rts.id}/")

        self.assertJSONResponse(response, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertTrue(Intervention.objects.filter(id=self.intervention_vaccination_rts.id).exists())

    def test_delete_intervention_used_only_by_deleted_scenarios_removes_it_from_their_rules(self):
        rts = self.intervention_vaccination_rts
        emptied_rule = self._create_deleted_scenario_rule([rts])
        shared_rule = self._create_deleted_scenario_rule([rts, self.intervention_chemo_smc])
        self.create_snt_rule_cost_override(emptied_rule, self.cost_line)

        self.client.force_authenticate(user=self.user_write)
        response = self.client.delete(f"{BASE_URL}{rts.id}/")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Intervention.objects.filter(id=rts.id).exists())
        self.assertFalse(ScenarioRuleCostOverride.objects.exists())
        self.assertFalse(ScenarioRule.objects.filter(id=emptied_rule.id).exists())
        self.assertEqual(list(shared_rule.interventions.all()), [self.intervention_chemo_smc])

    def test_delete_intervention_used_by_active_and_deleted_scenarios_returns_405_and_keeps_all_links(self):
        rts = self.intervention_vaccination_rts
        deleted_scenario_rule = self._create_deleted_scenario_rule([rts])
        self._create_rule(self._create_scenario(), [rts])

        self.client.force_authenticate(user=self.user_write)
        response = self.client.delete(f"{BASE_URL}{rts.id}/")

        self.assertJSONResponse(response, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertEqual(ScenarioRuleIntervention.objects.filter(intervention=rts).count(), 2)
        self.assertTrue(ScenarioRule.objects.filter(id=deleted_scenario_rule.id).exists())

    def test_delete_intervention_with_remove_from_rules_removes_it_from_active_rules(self):
        smc = self.intervention_chemo_smc
        scenario = self._create_scenario()
        emptied_rule = self._create_rule(scenario, [smc])
        shared_rule = self._create_rule(scenario, [smc, self.intervention_vaccination_rts])

        self.client.force_authenticate(user=self.user_write)
        response = self.client.delete(f"{BASE_URL}{smc.id}/?remove_from_rules=true")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Intervention.objects.filter(id=smc.id).exists())
        self.assertFalse(ScenarioRule.objects.filter(id=emptied_rule.id).exists())
        self.assertEqual(list(shared_rule.interventions.all()), [self.intervention_vaccination_rts])

    def test_delete_intervention_with_remove_from_rules_hands_its_districts_to_lower_priority_rules(self):
        """Removing SMC from the top rule lets the lower rule's IPTp (same category) take the district."""
        org_unit = self.create_snt_org_unit()
        scenario = self._create_scenario()
        self._create_rule(scenario, [self.intervention_chemo_iptp], priority=1, org_units_included=[org_unit.id])
        self._create_rule(
            scenario,
            [self.intervention_chemo_smc, self.intervention_vaccination_rts],
            priority=2,
            org_units_included=[org_unit.id],
        )
        scenario.refresh_assignments(self.user_write)

        self.client.force_authenticate(user=self.user_write)
        response = self.client.delete(f"{BASE_URL}{self.intervention_chemo_smc.id}/?remove_from_rules=true")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertCountEqual(
            scenario.intervention_assignments.values_list("intervention_id", flat=True),
            [self.intervention_chemo_iptp.id, self.intervention_vaccination_rts.id],
        )

    def test_delete_intervention_with_remove_from_rules_in_locked_scenario_returns_400(self):
        rts = self.intervention_vaccination_rts
        self._create_rule(self._create_scenario(name="Locked plan", is_locked=True), [rts])

        self.client.force_authenticate(user=self.user_write)
        response = self.client.delete(f"{BASE_URL}{rts.id}/?remove_from_rules=true")

        response_data = self.assertJSONResponse(response, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Locked plan", response_data["non_field_errors"][0])
        self.assertTrue(Intervention.objects.filter(id=rts.id).exists())

    def test_delete_intervention_with_replace_with_keeps_deployment_years_and_grant_and_drops_cost_overrides(self):
        rts, smc = self.intervention_vaccination_rts, self.intervention_chemo_smc
        rule = self._create_rule(self._create_scenario(), [rts])
        grant = self.create_snt_grant(account=self.account)
        ScenarioRuleIntervention.objects.filter(scenario_rule=rule).update(deployment_years=[2026], grant=grant)
        self.create_snt_rule_cost_override(rule, self.cost_line)

        self.client.force_authenticate(user=self.user_write)
        response = self.client.delete(f"{BASE_URL}{rts.id}/?replace_with={smc.id}")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Intervention.objects.filter(id=rts.id).exists())
        rule_intervention = ScenarioRuleIntervention.objects.get(scenario_rule=rule)
        self.assertEqual(rule_intervention.intervention, smc)
        self.assertEqual(rule_intervention.deployment_years, [2026])
        self.assertEqual(rule_intervention.grant, grant)
        self.assertFalse(ScenarioRuleCostOverride.objects.exists())

    def test_delete_intervention_with_replace_with_keeps_the_existing_link_of_a_rule_already_using_the_replacement(
        self,
    ):
        rts, smc = self.intervention_vaccination_rts, self.intervention_chemo_smc
        rule = self._create_rule(self._create_scenario(), [rts, smc])
        smc_cost_line = self.create_snt_cost_line(smc, created_by=self.user_write)
        smc_override = self.create_snt_rule_cost_override(rule, smc_cost_line)

        self.client.force_authenticate(user=self.user_write)
        response = self.client.delete(f"{BASE_URL}{rts.id}/?replace_with={smc.id}")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(list(rule.interventions.all()), [smc])
        self.assertTrue(ScenarioRuleCostOverride.objects.filter(id=smc_override.id).exists())

    def test_delete_intervention_with_replace_with_removes_it_from_deleted_scenarios(self):
        rts, smc = self.intervention_vaccination_rts, self.intervention_chemo_smc
        deleted_scenario_rule = self._create_deleted_scenario_rule([rts])

        self.client.force_authenticate(user=self.user_write)
        response = self.client.delete(f"{BASE_URL}{rts.id}/?replace_with={smc.id}")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(ScenarioRule.objects.filter(id=deleted_scenario_rule.id).exists())
        self.assertFalse(ScenarioRuleIntervention.objects.filter(intervention=smc).exists())

    def test_delete_intervention_with_replace_with_refreshes_assignments(self):
        org_unit = self.create_snt_org_unit()
        scenario = self._create_scenario()
        self._create_rule(scenario, [self.intervention_vaccination_rts], org_units_included=[org_unit.id])
        scenario.refresh_assignments(self.user_write)

        self.client.force_authenticate(user=self.user_write)
        response = self.client.delete(
            f"{BASE_URL}{self.intervention_vaccination_rts.id}/?replace_with={self.intervention_chemo_smc.id}"
        )

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(
            list(scenario.intervention_assignments.values_list("intervention_id", flat=True)),
            [self.intervention_chemo_smc.id],
        )

    def test_delete_intervention_with_invalid_replace_with_returns_400(self):
        rts = self.intervention_vaccination_rts
        other_account, _ = self.create_snt_account(name="Other account")
        other_category = self.create_snt_intervention_category(account=other_account, created_by=self.user_write)
        other_intervention = self.create_snt_intervention(
            intervention_category=other_category, created_by=self.user_write
        )
        self._create_rule(self._create_scenario(), [rts])

        self.client.force_authenticate(user=self.user_write)
        for query in (
            f"replace_with={rts.id}",
            f"replace_with={other_intervention.id}",
            f"replace_with={self.intervention_chemo_smc.id}&remove_from_rules=true",
        ):
            with self.subTest(query=query):
                response = self.client.delete(f"{BASE_URL}{rts.id}/?{query}")
                self.assertJSONResponse(response, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(Intervention.objects.filter(id=rts.id).exists())

    def test_usage_lists_locked_scenarios_first(self):
        rts = self.intervention_vaccination_rts
        self._create_rule(self._create_scenario(name="A open plan"), [rts])
        self._create_rule(self._create_scenario(name="B locked plan", is_locked=True), [rts])

        self.client.force_authenticate(user=self.user_read)
        response = self.client.get(f"{BASE_URL}{rts.id}/usage/")

        response_data = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertEqual(
            [(scenario["name"], scenario["is_locked"]) for scenario in response_data],
            [("B locked plan", True), ("A open plan", False)],
        )

    def test_usage_lists_only_active_scenarios_and_their_rules_using_the_intervention(self):
        rts = self.intervention_vaccination_rts
        scenario = self._create_scenario(name="Active plan")
        rule = self._create_rule(scenario, [rts], name="High PfPR")
        self._create_rule(scenario, [self.intervention_chemo_smc], name="Unrelated")
        self._create_deleted_scenario_rule([rts])

        self.client.force_authenticate(user=self.user_read)
        response = self.client.get(f"{BASE_URL}{rts.id}/usage/")

        response_data = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertEqual(
            response_data,
            [
                {
                    "id": scenario.id,
                    "name": "Active plan",
                    "is_locked": False,
                    "rules": [{"id": rule.id, "name": "High PfPR", "color": rule.color, "interventions": [rts.id]}],
                }
            ],
        )

    def test_delete_intervention_with_read_perm_forbidden(self):
        self.client.force_authenticate(user=self.user_read)
        response = self.client.delete(f"{BASE_URL}{self.intervention_vaccination_rts.id}/")
        self.assertJSONResponse(response, status.HTTP_403_FORBIDDEN)

    def test_delete_intervention_no_auth(self):
        response = self.client.delete(f"{BASE_URL}{self.intervention_vaccination_rts.id}/")
        self.assertJSONResponse(response, status.HTTP_401_UNAUTHORIZED)

    def test_delete_other_account_intervention_not_found(self):
        other_account, _ = self.create_snt_account(name="Other Account For Delete")
        other_category = self.create_snt_intervention_category(account=other_account, created_by=self.user_write)
        other_intervention = self.create_snt_intervention(
            intervention_category=other_category, created_by=self.user_write
        )

        self.client.force_authenticate(user=self.user_write)
        response = self.client.delete(f"{BASE_URL}{other_intervention.id}/")
        self.assertJSONResponse(response, status.HTTP_404_NOT_FOUND)

    # Duplicate

    def test_duplicate_intervention_copies_basic_fields_under_unique_name(self):
        self.intervention_vaccination_rts.impact_ref = "deployed_int_rtss"
        self.intervention_vaccination_rts.description = "Original description"
        self.intervention_vaccination_rts.save()

        self.client.force_authenticate(user=self.user_write)
        response = self.client.post(f"{BASE_URL}{self.intervention_vaccination_rts.id}/duplicate/")

        result = self.assertJSONResponse(response, status.HTTP_201_CREATED)
        self.assertNotEqual(result["id"], self.intervention_vaccination_rts.id)
        self.assertEqual(result["name"], f"{self.intervention_vaccination_rts.name} (copy)")

        duplicate = Intervention.objects.get(id=result["id"])
        self.assertEqual(duplicate.intervention_category, self.intervention_vaccination_rts.intervention_category)
        self.assertEqual(duplicate.code, self.intervention_vaccination_rts.code)
        self.assertEqual(duplicate.short_name, self.intervention_vaccination_rts.short_name)
        self.assertEqual(duplicate.impact_ref, "deployed_int_rtss")
        self.assertEqual(duplicate.description, "Original description")
        self.assertEqual(duplicate.created_by, self.user_write)
        # The source intervention keeps its own name.
        self.intervention_vaccination_rts.refresh_from_db()
        self.assertEqual(self.intervention_vaccination_rts.name, "RTS,S")

    def test_duplicate_intervention_copies_all_cost_breakdown_lines_to_new_rows(self):
        self.intervention_vaccination_rts.cost_breakdown_lines.create(
            name="Cost Line 2",
            unit_cost=25,
            category="Distribution",
            unit_type=self.unit_type_per_itn,
            created_by=self.user_write,
        )

        self.client.force_authenticate(user=self.user_write)
        response = self.client.post(f"{BASE_URL}{self.intervention_vaccination_rts.id}/duplicate/")
        result = self.assertJSONResponse(response, status.HTTP_201_CREATED)

        source_lines = self.intervention_vaccination_rts.cost_breakdown_lines.order_by("name")
        duplicate_lines = Intervention.objects.get(id=result["id"]).cost_breakdown_lines.order_by("name")

        self.assertEqual(source_lines.count(), 2)
        self.assertEqual(
            [(line.name, line.unit_cost, line.category, line.unit_type_id) for line in duplicate_lines],
            [(line.name, line.unit_cost, line.category, line.unit_type_id) for line in source_lines],
        )
        # New rows, not the same objects re-parented or shared.
        self.assertFalse(
            set(duplicate_lines.values_list("id", flat=True)) & set(source_lines.values_list("id", flat=True))
        )
        for line in duplicate_lines:
            self.assertEqual(line.created_by, self.user_write)

    def test_duplicate_intervention_twice_increments_copy_suffix(self):
        self.client.force_authenticate(user=self.user_write)
        url = f"{BASE_URL}{self.intervention_vaccination_rts.id}/duplicate/"

        first = self.assertJSONResponse(self.client.post(url), status.HTTP_201_CREATED)
        second = self.assertJSONResponse(self.client.post(url), status.HTTP_201_CREATED)

        self.assertEqual(first["name"], "RTS,S (copy)")
        self.assertEqual(second["name"], "RTS,S (copy) 2")

    def test_duplicate_intervention_with_read_perm_forbidden(self):
        self.client.force_authenticate(user=self.user_read)
        response = self.client.post(f"{BASE_URL}{self.intervention_vaccination_rts.id}/duplicate/")
        self.assertJSONResponse(response, status.HTTP_403_FORBIDDEN)

    def test_duplicate_intervention_no_auth(self):
        response = self.client.post(f"{BASE_URL}{self.intervention_vaccination_rts.id}/duplicate/")
        self.assertJSONResponse(response, status.HTTP_401_UNAUTHORIZED)

    def test_duplicate_other_account_intervention_not_found(self):
        other_account, _ = self.create_snt_account(name="Other Account For Duplicate")
        other_category = self.create_snt_intervention_category(account=other_account, created_by=self.user_write)
        other_intervention = self.create_snt_intervention(
            intervention_category=other_category, created_by=self.user_write
        )

        self.client.force_authenticate(user=self.user_write)
        response = self.client.post(f"{BASE_URL}{other_intervention.id}/duplicate/")
        self.assertJSONResponse(response, status.HTTP_404_NOT_FOUND)
