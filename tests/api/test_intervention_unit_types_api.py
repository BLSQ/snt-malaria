from rest_framework import status

from iaso.models.base import Account
from iaso.test import APITestCase


BASE_URL = "/api/snt_malaria/interventions/unit_types/"


class InterventionCostBreakdownLineCategoriesAPITestCase(APITestCase):
    def setUp(cls):
        # Create a user and account for testing
        cls.account = Account.objects.create(name="Test Account")
        cls.user = cls.create_user_with_profile(username="testuser", account=cls.account)

    def test_list_cintervention_unit_types(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(BASE_URL)
        json_response = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertCountEqual(
            json_response,
            [
                {"value": "PER_ITN", "label": "per ITN"},
                {"value": "PER_SP", "label": "per SP"},
                {"value": "PER_CHILD", "label": "per child"},
                {"value": "PER_DOSE", "label": "per dose"},
                {"value": "PER_SPAQ_3_11_MONTHS", "label": "per SPAQ pack 3-11 month olds"},
                {"value": "PER_SPAQ_12_59_MONTHS", "label": "per SPAQ pack 12-59 month olds"},
                {"value": "PER_SPAQ_5_10_YEARS", "label": "per SPAQ pack 5-10 years olds"},
                {"value": "PER_RDT_KIT", "label": "per RDT kit"},
                {"value": "PER_AL", "label": "per AL"},
                {"value": "PER_60MG_POWDER", "label": "per 60mg powder"},
                {"value": "PER_RAS", "label": "per RAS"},
                {"value": "PER_BALE", "label": "per bale"},
                {"value": "OTHER", "label": "Other"},
            ],
        )

    def test_list_unit_types_unauthorized(self):
        response = self.client.get(BASE_URL)
        self.assertJSONResponse(response, status.HTTP_401_UNAUTHORIZED)
