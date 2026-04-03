from unittest.mock import patch

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework import status
from rest_framework.exceptions import ValidationError

from iaso.models import Account, DataSource, Profile, Project, SourceVersion
from iaso.test import APITestCase
from plugins.snt_malaria.models import BudgetSettings, Intervention, InterventionCategory, InterventionCostBreakdownLine


class SNTAccountSetupAPITestCase(APITestCase):
    BASE_URL = "/api/snt_malaria/account_setup/"
    JSON_FILE_NAME = "geo_json_be.json"
    JSON_FILE_PATH = f"plugins/snt_malaria/tests/fixtures/{JSON_FILE_NAME}"

    @override_settings(ENABLE_PUBLIC_ACCOUNT_SETUP=True)
    def test_post_account_setup_public(self):
        with open(self.JSON_FILE_PATH, "rb") as json_file:
            payload = {
                "username": "test",
                "password": "password",
                "password_confirmation": "password",
                "country": "BE",
                "language": "fr",
                "geo_json_file": SimpleUploadedFile(
                    self.JSON_FILE_NAME, json_file.read(), content_type="application/json"
                ),
            }
        response = self.client.post(self.BASE_URL, data=payload, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Making sure that all objects are created
        self.assertEqual(Account.objects.count(), 1)
        self.assertEqual(DataSource.objects.count(), 1)
        self.assertEqual(SourceVersion.objects.count(), 1)
        self.assertEqual(Project.objects.count(), 1)
        self.assertEqual(User.objects.count(), 1)
        self.assertEqual(Profile.objects.count(), 1)

        # SNT models
        self.assertEqual(BudgetSettings.objects.count(), 1)
        # see intervention_seeder.py to understand why these values
        self.assertEqual(InterventionCategory.objects.count(), 8)
        self.assertEqual(Intervention.objects.count(), 21)
        self.assertEqual(InterventionCostBreakdownLine.objects.count(), 27)

        # Checking this after launching task
        # self.assertEqual(OrgUnitType.objects.count(), 3)  # country, region, province
        # self.assertEqual(OrgUnit.objects.count(), 14)

    def test_post_account_setup_disabled(self):
        """
        This public endpoint is not allowed because settings.ENABLE_PUBLIC_ACCOUNT_SETUP is False
        """
        with open(self.JSON_FILE_PATH, "rb") as json_file:
            payload = {
                "username": "test",
                "password": "password",
                "password_confirmation": "password",
                "country": "BE",
                "language": "fr",
                "geo_json_file": SimpleUploadedFile(
                    self.JSON_FILE_NAME, json_file.read(), content_type="application/json"
                ),
            }

        response = self.client.post(self.BASE_URL, data=payload, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    @override_settings(ENABLE_PUBLIC_ACCOUNT_SETUP=True)
    @patch("plugins.snt_malaria.api.account_setup.views.create_snt_account")
    def test_post_account_setup_error_account_atomic(self, mock_account_creation):
        error_str = "some conflict in names"
        mock_account_creation.side_effect = ValidationError(error_str)

        with open(self.JSON_FILE_PATH, "rb") as json_file:
            payload = {
                "username": "test",
                "password": "password",
                "password_confirmation": "password",
                "country": "BE",
                "language": "fr",
                "geo_json_file": SimpleUploadedFile(
                    self.JSON_FILE_NAME, json_file.read(), content_type="application/json"
                ),
            }

        response = self.client.post(self.BASE_URL, data=payload, format="multipart")
        self.assertContains(response, error_str, status_code=status.HTTP_400_BAD_REQUEST)

        self._check_nothing_has_been_created()

    @override_settings(ENABLE_PUBLIC_ACCOUNT_SETUP=True)
    @patch("plugins.snt_malaria.api.account_setup.views.transform_geo_json_to_gpkg")
    def test_post_account_setup_error_account_atomic(self, mock_geo_json_transform):
        error_str = "something happened while processing the geo json file"
        mock_geo_json_transform.side_effect = ValueError(error_str)

        with open(self.JSON_FILE_PATH, "rb") as json_file:
            payload = {
                "username": "test",
                "password": "password",
                "password_confirmation": "password",
                "country": "BE",
                "language": "fr",
                "geo_json_file": SimpleUploadedFile(
                    self.JSON_FILE_NAME, json_file.read(), content_type="application/json"
                ),
            }

        response = self.client.post(self.BASE_URL, data=payload, format="multipart")
        self.assertContains(response, error_str, status_code=status.HTTP_400_BAD_REQUEST)

        self._check_nothing_has_been_created()

    def _check_nothing_has_been_created(self):
        # Making sure that all objects are created
        self.assertEqual(Account.objects.count(), 0)
        self.assertEqual(DataSource.objects.count(), 0)
        self.assertEqual(SourceVersion.objects.count(), 0)
        self.assertEqual(Project.objects.count(), 0)
        self.assertEqual(User.objects.count(), 0)
        self.assertEqual(Profile.objects.count(), 0)
        self.assertEqual(BudgetSettings.objects.count(), 0)
        self.assertEqual(InterventionCategory.objects.count(), 0)
        self.assertEqual(Intervention.objects.count(), 0)
        self.assertEqual(InterventionCostBreakdownLine.objects.count(), 0)
