from django.urls import reverse
from rest_framework import status

from iaso.models.base import Account
from iaso.test import APITestCase
from plugins.snt_malaria.models.cost_breakdown import InterventionCostBreakdownLine
from plugins.snt_malaria.models.intervention import Intervention, InterventionCategory


class InterventionCostBreakdownLineTests(APITestCase):
    def setUp(cls):
        # Create a user and account for testing
        cls.account = Account.objects.create(name="Test Account")
        cls.user = cls.create_user_with_profile(username="testuser", account=cls.account)

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
        )
        cls.intervention_chemo_smc = Intervention.objects.create(
            name="SMC",
            created_by=cls.user,
            intervention_category=cls.int_category_chemoprevention,
        )
        cls.intervention_chemo_iptp = Intervention.objects.create(
            name="IPTp",
            created_by=cls.user,
            intervention_category=cls.int_category_chemoprevention,
        )

        # Create cost breakdown lines
        cls.cost_line1 = InterventionCostBreakdownLine.objects.create(
            name="Cost Line 1",
            intervention=cls.intervention_vaccination_rts,
            unit_cost=10,
            category="Procurement",
            created_by=cls.user,
        )
        cls.cost_line2 = InterventionCostBreakdownLine.objects.create(
            name="Cost Line 2",
            intervention=cls.intervention_chemo_smc,
            unit_cost=5,
            category="Procurement",
            created_by=cls.user,
        )

    def test_list_cost_breakdown_lines(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("intervention_cost_breakdown_lines-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_create_cost_breakdown_line(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("intervention_cost_breakdown_lines-list")
        data = {
            "intervention": self.intervention_chemo_iptp.id,
            "costs": [{"unit_cost": 15, "name": "Cost Line X", "category": "Procurement"}],
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(InterventionCostBreakdownLine.objects.count(), 3)
        self.assertEqual(InterventionCostBreakdownLine.objects.get(name="Cost Line X").unit_cost, 15)

    def test_create_cost_breakdown_line_missing_intervention(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("intervention_cost_breakdown_lines-list")
        data = {
            "costs": [{"unit_cost": 15, "unit_type": "doses", "category": "Procurement"}],
        }
        response = self.client.post(url, data, format="json")
        json_response = self.assertJSONResponse(response, status.HTTP_400_BAD_REQUEST)
        self.assertIn("This field is required.", json_response["intervention"])

    def test_create_cost_breakdown_line_missing_costs(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("intervention_cost_breakdown_lines-list")
        data = {
            "intervention": self.intervention_chemo_iptp.id,
        }
        response = self.client.post(url, data, format="json")
        json_response = self.assertJSONResponse(response, status.HTTP_400_BAD_REQUEST)
        self.assertIn("This field is required.", json_response["costs"])

    def test_create_cost_breakdown_line_cost_below_zero(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("intervention_cost_breakdown_lines-list")
        data = {
            "intervention": self.intervention_chemo_iptp.id,
            "costs": [{"unit_cost": -5, "name": "test", "category": "Procurement"}],
        }

        response = self.client.post(url, data, format="json")
        json_response = self.assertJSONResponse(response, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Ensure this value is greater than or equal to 0.", json_response["costs"][0]["unit_cost"])

    def test_create_cost_breakdown_line_missing_costs_name(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("intervention_cost_breakdown_lines-list")
        data = {
            "intervention": self.intervention_chemo_iptp.id,
            "costs": [{"unit_cost": 15, "category": "Procurement"}],
        }
        response = self.client.post(url, data, format="json")
        json_response = self.assertJSONResponse(response, status.HTTP_400_BAD_REQUEST)
        self.assertIn("This field is required.", json_response["costs"][0]["name"])

    def test_create_cost_breakdown_line_missing_costs_cost(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("intervention_cost_breakdown_lines-list")
        data = {
            "intervention": self.intervention_chemo_iptp.id,
            "costs": [{"name": "test", "category": "Procurement"}],
        }
        response = self.client.post(url, data, format="json")
        json_response = self.assertJSONResponse(response, status.HTTP_400_BAD_REQUEST)
        self.assertIn("This field is required.", json_response["costs"][0]["unit_cost"])

    def test_create_cost_breakdown_line_missing_costs_category(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("intervention_cost_breakdown_lines-list")
        data = {
            "intervention": self.intervention_chemo_iptp.id,
            "costs": [{"name": "test", "unit_cost": 15}],
        }
        response = self.client.post(url, data, format="json")
        json_response = self.assertJSONResponse(response, status.HTTP_400_BAD_REQUEST)
        self.assertIn("This field is required.", json_response["costs"][0]["category"])

    def test_create_cost_breakdown_line_invalid_category(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("intervention_cost_breakdown_lines-list")
        invalid_category_id = 9999  # Assuming this ID does not exist
        data = {
            "intervention": self.intervention_chemo_iptp.id,
            "costs": [{"name": "test", "unit_cost": 15, "category": invalid_category_id}],
        }
        response = self.client.post(url, data, format="json")
        json_response = self.assertJSONResponse(response, status.HTTP_400_BAD_REQUEST)
        self.assertIn('"9999" is not a valid choice.', json_response["costs"][0]["category"])

    # Not Logged in
    def test_list_cost_breakdown_lines(self):
        url = reverse("intervention_cost_breakdown_lines-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_cost_breakdown_line(self):
        url = reverse("intervention_cost_breakdown_lines-list")
        data = {
            "intervention": self.intervention_chemo_iptp.id,
            "costs": [{"unit_cost": 15, "name": "Cost Line X", "category": "Procurement"}],
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(InterventionCostBreakdownLine.objects.count(), 2)
