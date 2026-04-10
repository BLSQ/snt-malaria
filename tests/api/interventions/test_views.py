from rest_framework import status

from iaso.models.base import Account
from iaso.test import APITestCase
from plugins.snt_malaria.models.intervention import Intervention, InterventionCategory


BASE_URL = "/api/snt_malaria/interventions/"


class InterventionAPITests(APITestCase):
    def setUp(cls):
        cls.account = Account.objects.create(name="Test Account 3")
        cls.user = cls.create_user_with_profile(username="testuserintervention", account=cls.account)
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

        cls.cost_line = cls.intervention_vaccination_rts.cost_breakdown_lines.create(
            name="Cost Line 1",
            unit_cost=10,
            category="Procurement",
            year=2024,
        )

    def test_list_interventions_authenticated(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(BASE_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 3)
        rts_intervention = next(
            (item for item in response.data if item["id"] == self.intervention_vaccination_rts.id), None
        )
        self.assertIsNotNone(rts_intervention)

    def test_list_intervention_unauthenticated(self):
        response = self.client.get(BASE_URL)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_retrieve_intervention_details(self):
        self.client.force_authenticate(user=self.user)
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

    def test_update_intervention_details(self):
        self.client.force_authenticate(user=self.user)
        url = f"{BASE_URL}{self.intervention_vaccination_rts.id}/update_details/"
        data = {
            "name": "Updated RTS,S",
            "impact_ref": "updated_ref",
            "cost_breakdown_lines": [
                {
                    "name": "Updated Cost Line 1",
                    "unit_cost": 15,
                    "category": "Procurement",
                    "year": 2024,
                },
                {
                    "name": "New Cost Line 2",
                    "unit_cost": 20,
                    "category": "Distribution",
                    "year": 2024,
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
                    "year": 2024,
                },
                {
                    "name": "New Cost Line 2",
                    "unit_cost": 20,
                    "category": "Distribution",
                    "year": 2024,
                },
            ],
        }
        response = self.client.put(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
