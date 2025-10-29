from decimal import Decimal

from django.urls import reverse
from rest_framework import status

from iaso.models.base import Account
from iaso.test import APITestCase
from plugins.snt_malaria.models.cost_breakdown import InterventionCostBreakdownLine
from plugins.snt_malaria.models.intervention import Intervention, InterventionCategory


class InterventionCostBreakdownLineAPITests(APITestCase):
    def setUp(cls):
        cls.account = Account.objects.create(name="Test Account")
        cls.user = cls.create_user_with_profile(username="testuser", account=cls.account)
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
        cls.cost_line1 = InterventionCostBreakdownLine.objects.create(
            name="Cost Line 1",
            intervention=cls.intervention_vaccination_rts,
            unit_cost=10,
            category="Procurement",
            created_by=cls.user,
            year=2025,
        )
        cls.cost_line2 = InterventionCostBreakdownLine.objects.create(
            name="Cost Line 2",
            intervention=cls.intervention_chemo_smc,
            unit_cost=5,
            category="Procurement",
            created_by=cls.user,
            year=2025,
        )
        cls.cost_line3 = InterventionCostBreakdownLine.objects.create(
            name="Cost Line 3",
            intervention=cls.intervention_chemo_smc,
            unit_cost=5.55,
            category="Supportive",
            created_by=cls.user,
            year=2025,
        )
        cls.cost_line4 = InterventionCostBreakdownLine.objects.create(
            name="Cost Line 4",
            intervention=cls.intervention_chemo_smc,
            unit_cost=5.55,
            category="Supportive",
            created_by=cls.user,
            year=2026,
        )

    def test_list_cost_breakdown_lines_authenticated_no_year_filter(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("intervention_cost_breakdown_lines-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 4)

    def test_list_cost_breakdown_lines_authenticated_with_year_filter(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("intervention_cost_breakdown_lines-list")
        response = self.client.get(url, {"year": 2025})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 3)

    def test_create_cost_breakdown_line_authenticated(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("intervention_cost_breakdown_lines-list")
        data = {
            "intervention": self.intervention_chemo_iptp.id,
            "year": 2025,
            "costs": [
                {"unit_cost": 15, "unit_type": "OTHER", "name": "Cost Line X", "category": "Procurement", "year": 2025}
            ],
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(InterventionCostBreakdownLine.objects.count(), 5)
        self.assertEqual(InterventionCostBreakdownLine.objects.get(name="Cost Line X").unit_cost, 15)

    def test_list_cost_breakdown_lines_unauthenticated(self):
        url = reverse("intervention_cost_breakdown_lines-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_cost_breakdown_line_unauthenticated(self):
        url = reverse("intervention_cost_breakdown_lines-list")
        data = {
            "intervention": self.intervention_chemo_iptp.id,
            "costs": [
                {"unit_cost": 15, "unit_type": "OTHER", "name": "Cost Line X", "category": "Procurement", "year": 2025}
            ],
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(InterventionCostBreakdownLine.objects.count(), 4)
