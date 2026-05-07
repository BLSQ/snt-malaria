from rest_framework import status

from plugins.snt_malaria.models.account_settings import AccountSettings
from plugins.snt_malaria.tests.common_base import SNTMalariaAPITestCase


BASE_URL = "/api/snt_malaria/account_settings/"


class AccountSettingsAPITests(SNTMalariaAPITestCase):
    auto_create_account = False

    def setUp(self):
        super().setUp()
        self.account, self.user = self.create_snt_account(name="Test Account 3")
        self.out_district = self.create_snt_org_unit_type(name="DISTRICT")

        self.account_settings = AccountSettings.objects.create(
            account=self.account,
            intervention_org_unit_type=self.out_district,
        )

    def test_list_account_settings_authenticated(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(BASE_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        account_settings = next((item for item in response.data if item["id"] == self.account_settings.id), None)
        self.assertIsNotNone(account_settings)
        self.assertEqual(account_settings["intervention_org_unit_type_id"], self.out_district.id)

    def test_list_account_settings_unauthenticated(self):
        response = self.client.get(BASE_URL)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
