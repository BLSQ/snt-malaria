from rest_framework import status

from iaso.test import APITestCase
from plugins.snt_malaria.models import BudgetSettings
from plugins.snt_malaria.permissions import SNT_SETTINGS_READ_PERMISSION, SNT_SETTINGS_WRITE_PERMISSION


class BudgetSettingsAPITestCase(APITestCase):
    BASE_URL = "/api/snt_malaria/budget_settings/"

    def setUp(self):
        self.account, _, _, _ = self.create_account_datasource_version_project("source", "account", "project")
        self.user_write, self.anon, self.user_no_perms = self.create_base_users(
            self.account, [SNT_SETTINGS_WRITE_PERMISSION], "user write"
        )
        self.user_read = self.create_user_with_profile(
            username="user read", account=self.account, permissions=[SNT_SETTINGS_READ_PERMISSION]
        )

        self.budget_settings_usd = BudgetSettings.objects.create(
            account=self.account,
            local_currency="USD",
            exchange_rate=1.0,
            inflation_rate=0.02,
        )

        # Prepare other account to check tenancy
        self.account2, _, _, _ = self.create_account_datasource_version_project("source2", "account2", "project2")
        self.user2 = self.create_user_with_profile(
            username="user2", account=self.account2, permissions=[SNT_SETTINGS_WRITE_PERMISSION]
        )

        self.budget_settings_usd2 = BudgetSettings.objects.create(
            account=self.account2,
            local_currency="USD",
            exchange_rate=2.0,
            inflation_rate=2.02,
        )

    def test_budget_settings_list_with_write_perm(self):
        self.client.force_authenticate(self.user_write)
        response = self.client.get(self.BASE_URL)
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertEqual(len(result), 1)
        first_result = result[0]
        self.assertEqual(first_result["id"], self.budget_settings_usd.id)
        self.assertEqual(first_result["local_currency"], self.budget_settings_usd.local_currency)
        # There's no limit on the serializer decimal places, so we need to use assertAlmostEqual for the float values
        self.assertAlmostEqual(float(first_result["exchange_rate"]), self.budget_settings_usd.exchange_rate)
        self.assertAlmostEqual(float(first_result["inflation_rate"]), self.budget_settings_usd.inflation_rate)

    def test_budget_settings_list_with_read_perm(self):
        self.client.force_authenticate(self.user_read)
        response = self.client.get(self.BASE_URL)
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertEqual(len(result), 1)
        first_result = result[0]
        self.assertEqual(first_result["id"], self.budget_settings_usd.id)
        self.assertEqual(first_result["local_currency"], self.budget_settings_usd.local_currency)
        # There's no limit on the serializer decimal places, so we need to use assertAlmostEqual for the float values
        self.assertAlmostEqual(float(first_result["exchange_rate"]), self.budget_settings_usd.exchange_rate)
        self.assertAlmostEqual(float(first_result["inflation_rate"]), self.budget_settings_usd.inflation_rate)

    def test_budget_settings_list_with_no_perms(self):
        self.client.force_authenticate(self.user_no_perms)
        response = self.client.get(self.BASE_URL)
        self.assertJSONResponse(response, status.HTTP_403_FORBIDDEN)

    def test_budget_settings_list_no_auth(self):
        response = self.client.get("/api/snt_malaria/budget_settings/")
        self.assertJSONResponse(response, status.HTTP_401_UNAUTHORIZED)

    def test_budget_settings_retrieve_with_write_perm(self):
        self.client.force_authenticate(self.user_write)
        response = self.client.get(f"{self.BASE_URL}{self.budget_settings_usd.id}/")
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertEqual(result["id"], self.budget_settings_usd.id)
        self.assertEqual(result["local_currency"], self.budget_settings_usd.local_currency)
        # There's no limit on the serializer decimal places, so we need to use assertAlmostEqual for the float values
        self.assertAlmostEqual(float(result["exchange_rate"]), self.budget_settings_usd.exchange_rate)
        self.assertAlmostEqual(float(result["inflation_rate"]), self.budget_settings_usd.inflation_rate)

    def test_budget_settings_retrieve_with_read_perm(self):
        self.client.force_authenticate(self.user_read)
        response = self.client.get(f"{self.BASE_URL}{self.budget_settings_usd.id}/")
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertEqual(result["id"], self.budget_settings_usd.id)
        self.assertEqual(result["local_currency"], self.budget_settings_usd.local_currency)
        # There's no limit on the serializer decimal places, so we need to use assertAlmostEqual for the float values
        self.assertAlmostEqual(float(result["exchange_rate"]), self.budget_settings_usd.exchange_rate)
        self.assertAlmostEqual(float(result["inflation_rate"]), self.budget_settings_usd.inflation_rate)

    def test_budget_settings_retrieve_with_no_perms(self):
        self.client.force_authenticate(self.user_no_perms)
        response = self.client.get(f"{self.BASE_URL}{self.budget_settings_usd.id}/")
        self.assertJSONResponse(response, status.HTTP_403_FORBIDDEN)

    def test_budget_settings_retrieve_no_auth(self):
        response = self.client.get(f"{self.BASE_URL}{self.budget_settings_usd.id}/")
        self.assertJSONResponse(response, status.HTTP_401_UNAUTHORIZED)

    def test_budget_settings_retrieve_other_account(self):
        self.client.force_authenticate(self.user_write)
        response = self.client.get(f"{self.BASE_URL}{self.budget_settings_usd2.id}/")
        self.assertJSONResponse(response, status.HTTP_404_NOT_FOUND)

    def test_budget_settings_create_not_allowed(self):
        self.client.force_authenticate(self.user_write)
        data = {
            "local_currency": "EUR",
            "exchange_rate": 0.9,
            "inflation_rate": 0.01,
        }
        response = self.client.post(self.BASE_URL, data=data)
        self.assertJSONResponse(response, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_budget_settings_patch_not_allowed(self):
        self.client.force_authenticate(self.user_write)
        data = {
            "local_currency": "EUR",
            "exchange_rate": 0.9,
            "inflation_rate": 0.01,
        }
        response = self.client.patch(f"{self.BASE_URL}{self.budget_settings_usd.id}/", data=data)
        self.assertJSONResponse(response, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_budget_settings_put_not_allowed(self):
        self.client.force_authenticate(self.user_write)
        data = {
            "local_currency": "EUR",
            "exchange_rate": 0.9,
            "inflation_rate": 0.01,
        }
        response = self.client.put(f"{self.BASE_URL}{self.budget_settings_usd.id}/", data=data)
        self.assertJSONResponse(response, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_budget_settings_delete_not_allowed(self):
        self.client.force_authenticate(self.user_write)
        response = self.client.delete(f"{self.BASE_URL}{self.budget_settings_usd.id}/")
        self.assertJSONResponse(response, status.HTTP_405_METHOD_NOT_ALLOWED)
