from rest_framework import status

from plugins.snt_malaria.models.account_settings import AccountSettings
from plugins.snt_malaria.tests.common_base import SNTMalariaAPITestCase


BASE_URL = "/api/snt_malaria/account_settings/"


class AccountSettingsAPITests(SNTMalariaAPITestCase):
    auto_create_account = False

    def setUp(self):
        super().setUp()
        (
            self.account,
            self.user,
            _main_ds,
            _main_sv,
            self.project,
        ) = self.create_snt_account_with_project(
            source_name="account_settings_ds",
            account_name="Test Account 3",
            project_name="account_settings_proj",
            username="testuseraccountsettings",
        )
        self.region_type = self.create_org_unit_type(
            "Region",
            [self.project],
            category="REGION",
        )
        self.out_district = self.create_org_unit_type(
            "DISTRICT",
            [self.project],
            category="DISTRICT",
        )

        self.account_settings = AccountSettings.objects.create(
            account=self.account,
            intervention_org_unit_type=self.out_district,
        )

        (
            self.other_account,
            _other_ds,
            _other_sv,
            self.other_project,
        ) = self.create_account_datasource_version_project(
            "other_ds",
            "Other Account",
            "other_proj",
            app_id="app_other_account_settings",
        )
        self.other_out = self.create_org_unit_type(
            "OTH_DIST",
            [self.other_project],
            category="DISTRICT",
        )
        self.other_settings = AccountSettings.objects.create(
            account=self.other_account,
            intervention_org_unit_type=self.other_out,
        )

    def test_list_account_settings_authenticated(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(BASE_URL)
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertEqual(len(result), 1)
        account_settings = next(
            (item for item in result if item["id"] == self.account_settings.id),
            None,
        )
        self.assertIsNotNone(account_settings)
        self.assertEqual(
            account_settings["intervention_org_unit_type_id"],
            self.out_district.id,
        )

    def test_list_account_settings_unauthenticated(self):
        response = self.client.get(BASE_URL)
        self.assertJSONResponse(response, status.HTTP_401_UNAUTHORIZED)

    def test_retrieve_own_settings(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f"{BASE_URL}{self.account_settings.id}/")
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertEqual(result["id"], self.account_settings.id)
        self.assertEqual(result["account"], self.account.id)
        self.assertEqual(
            result["intervention_org_unit_type_id"],
            self.out_district.id,
        )

    def test_retrieve_other_accounts_settings_returns_404(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f"{BASE_URL}{self.other_settings.id}/")
        self.assertJSONResponse(response, status.HTTP_404_NOT_FOUND)

    def test_patch_own_settings(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.patch(
            f"{BASE_URL}{self.account_settings.id}/",
            {
                "focus_org_unit_type_id": self.region_type.id,
                "intervention_org_unit_type_id": self.out_district.id,
            },
            format="json",
        )
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertEqual(result["focus_org_unit_type_id"], self.region_type.id)
        self.account_settings.refresh_from_db()
        self.assertEqual(self.account_settings.focus_org_unit_type_id, self.region_type.id)

    def test_patch_clear_focus_org_unit_type(self):
        self.account_settings.focus_org_unit_type = self.region_type
        self.account_settings.save()
        self.client.force_authenticate(user=self.user)
        response = self.client.patch(
            f"{BASE_URL}{self.account_settings.id}/",
            {"focus_org_unit_type_id": None},
            format="json",
        )
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertIsNone(result["focus_org_unit_type_id"])
        self.account_settings.refresh_from_db()
        self.assertIsNone(self.account_settings.focus_org_unit_type_id)

    def test_patch_rejects_org_unit_type_not_on_account(self):
        """Org unit types must belong to the user's account (via project)."""
        self.client.force_authenticate(user=self.user)
        response = self.client.patch(
            f"{BASE_URL}{self.account_settings.id}/",
            {"intervention_org_unit_type_id": self.other_out.id},
            format="json",
        )
        self.assertJSONResponse(response, status.HTTP_400_BAD_REQUEST)

    def test_patch_other_accounts_pk_returns_404(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.patch(
            f"{BASE_URL}{self.other_settings.id}/",
            {"focus_org_unit_type_id": self.region_type.id},
            format="json",
        )
        self.assertJSONResponse(response, status.HTTP_404_NOT_FOUND)

    def test_patch_does_not_reassign_account(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.patch(
            f"{BASE_URL}{self.account_settings.id}/",
            {"account": self.other_account.id},
            format="json",
        )
        self.assertJSONResponse(response, status.HTTP_200_OK)
        self.account_settings.refresh_from_db()
        self.assertEqual(self.account_settings.account_id, self.account.id)

    def test_post_not_allowed(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            BASE_URL,
            {
                "account": self.account.id,
                "intervention_org_unit_type_id": self.out_district.id,
            },
            format="json",
        )
        self.assertJSONResponse(response, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_delete_not_allowed(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.delete(f"{BASE_URL}{self.account_settings.id}/")
        self.assertJSONResponse(response, status.HTTP_405_METHOD_NOT_ALLOWED)
