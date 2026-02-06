from django.urls import reverse
from rest_framework import status

from iaso.models.base import Account
from iaso.test import APITestCase


class InterventionCostBreakdownLineCategoriesAPITestCase(APITestCase):
    def setUp(cls):
        # Create a user and account for testing
        cls.account = Account.objects.create(name="Test Account")
        cls.user = cls.create_user_with_profile(username="testuser", account=cls.account)

    def test_list_cost_breakdown_lines_categories(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("intervention_cost_breakdown_lines-categories")
        response = self.client.get(url)
        json_response = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertCountEqual(
            json_response,
            [
                {"value": "Procurement", "label": "Procurement"},
                {"value": "Distribution", "label": "Distribution"},
                {"value": "Operational", "label": "Operational"},
                {"value": "Supportive", "label": "Supportive"},
                {"value": "Other", "label": "Other"},
            ],
        )

    def test_list_cost_breakdown_lines_categories_unauthorized(self):
        url = reverse("intervention_cost_breakdown_lines-categories")
        response = self.client.get(url)
        self.assertJSONResponse(response, status.HTTP_401_UNAUTHORIZED)
