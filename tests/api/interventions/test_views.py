from rest_framework import status

from plugins.snt_malaria.api.interventions.permissions import (
    SNT_SETTINGS_READ_PERMISSION,
    SNT_SETTINGS_WRITE_PERMISSION,
)
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

        self.cost_line = self.intervention_vaccination_rts.cost_breakdown_lines.create(
            name="Cost Line 1",
            unit_cost=10,
            category="Procurement",
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
                    "category": "Procurement",
                },
                {
                    "name": "New Cost Line 2",
                    "unit_cost": 20,
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

    def test_update_intervention_details_unauthenticated(self):
        url = f"{BASE_URL}{self.intervention_vaccination_rts.id}/update_details/"
        data = {
            "name": "Updated RTS,S",
            "impact_ref": "updated_ref",
            "cost_breakdown_lines": [
                {
                    "name": "Updated Cost Line 1",
                    "unit_cost": 15,
                    "category": "Procurement",
                },
                {
                    "name": "New Cost Line 2",
                    "unit_cost": 20,
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
                    "category": "Procurement",
                },
                {
                    "name": "New Cost Line 2",
                    "unit_cost": 20,
                    "category": "Distribution",
                },
            ],
        }
        response = self.client.put(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
