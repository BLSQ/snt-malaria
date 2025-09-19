from django.urls import reverse
from rest_framework import status

from iaso.models.base import Account
from iaso.test import APITestCase
from plugins.snt_malaria.models.cost_breakdown import CostBreakdownLine, CostBreakdownLineCategory
from plugins.snt_malaria.models.intervention import Intervention, InterventionCategory


class CostBreakdownLineTests(APITestCase):
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

        # Create Cost Breakdown Line Categories
        cls.cost_category_vaccine = CostBreakdownLineCategory.objects.create(
            name="Vaccine",
            account=cls.account,
            created_by=cls.user,
        )

        # Create cost breakdown lines
        cls.cost_line1 = CostBreakdownLine.objects.create(
            name="Cost Line 1",
            intervention=cls.intervention_vaccination_rts,
            cost=10,
            category=cls.cost_category_vaccine,
            created_by=cls.user,
        )
        cls.cost_line2 = CostBreakdownLine.objects.create(
            name="Cost Line 2",
            intervention=cls.intervention_chemo_smc,
            cost=5,
            category=cls.cost_category_vaccine,
            created_by=cls.user,
        )

    def test_list_cost_breakdown_lines(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("cost_breakdown_lines-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_create_cost_breakdown_line(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("cost_breakdown_lines-list")
        data = {
            "intervention": self.intervention_chemo_iptp.id,
            "costs": [{"cost": 15, "name": "Cost Line X", "category": self.cost_category_vaccine.id}],
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(CostBreakdownLine.objects.count(), 3)
        self.assertEqual(CostBreakdownLine.objects.get(name="Cost Line X").cost, 15)

    def test_create_cost_breakdown_line_missing_intervention(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("cost_breakdown_lines-list")
        data = {
            "costs": {"unit_cost": 15, "unit_type": "doses", "category": self.cost_category_vaccine.id},
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("This field is required", str(response.data))

    def test_create_cost_breakdown_line_missing_costs(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("cost_breakdown_lines-list")
        data = {
            "intervention": self.intervention_chemo_iptp.id,
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("This field is required", str(response.data))

    def test_create_cost_breakdown_line_missing_costs_name(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("cost_breakdown_lines-list")
        data = {
            "intervention": self.intervention_chemo_iptp.id,
            "costs": [{"cost": 15, "category": self.cost_category_vaccine.id}],
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("'name': [ErrorDetail(string='This field is required.'", str(response.data))

    def test_create_cost_breakdown_line_missing_costs_cost(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("cost_breakdown_lines-list")
        data = {
            "intervention": self.intervention_chemo_iptp.id,
            "costs": [{"name": "test", "category": self.cost_category_vaccine.id}],
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("'cost': [ErrorDetail(string='This field is required.'", str(response.data))

    def test_create_cost_breakdown_line_missing_costs_category(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("cost_breakdown_lines-list")
        data = {
            "intervention": self.intervention_chemo_iptp.id,
            "costs": [{"name": "test", "cost": 15}],
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("'category': [ErrorDetail(string='This field is required.'", str(response.data))

    def test_create_cost_breakdown_line_invalid_category(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("cost_breakdown_lines-list")
        invalid_category_id = 9999  # Assuming this ID does not exist
        data = {
            "intervention": self.intervention_chemo_iptp.id,
            "costs": [{"name": "test", "cost": 15, "category": invalid_category_id}],
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn(
            "'category': [ErrorDetail(string='Invalid pk \"9999\" - object does not exist.'", str(response.data)
        )

    def test_create_cost_breakdown_line_category_not_in_account(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("cost_breakdown_lines-list")
        # Create a category in a different account
        other_account = Account.objects.create(name="Other Account")
        other_user = self.create_user_with_profile(username="otheruser", account=other_account)
        other_category = CostBreakdownLineCategory.objects.create(
            name="Other Category",
            account=other_account,
            created_by=other_user,
        )
        data = {
            "intervention": self.intervention_chemo_iptp.id,
            "costs": [{"name": "test", "cost": 20, "category": other_category.id}],
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("does not belong to your account", str(response.data))
