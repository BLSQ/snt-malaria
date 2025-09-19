from django.urls import reverse
from rest_framework import status

from iaso.models.base import Account
from iaso.test import APITestCase
from plugins.snt_malaria.models.cost_breakdown import CostBreakdownLineCategory


class CostBreakdownCategoryTests(APITestCase):
    def setUp(self):
        self.account = Account.objects.create(name="Test Account")
        self.user = self.create_user_with_profile(username="user", account=self.account)
        self.category = CostBreakdownLineCategory.objects.create(name="Test Category", account=self.account)

    def test__list_categories(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("cost_breakdown_line_categories-list")
        response = self.client.get(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "Test Category")
