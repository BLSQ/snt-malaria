import tempfile

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django_countries import countries
from rest_framework import status

from iaso.models import Account, DataSource, SourceVersion, OrgUnitType, OrgUnit
from iaso.test import APITestCase


class SNTAccountSetupAPITestCase(APITestCase):
    BASE_URL = "/api/snt_malaria/account_setup/"
    JSON_FILE_NAME = "geo_json_be.json"
    JSON_FILE_PATH = f"plugins/snt_malaria/tests/fixtures/{JSON_FILE_NAME}"

    @override_settings(ENABLE_PUBLIC_ACCOUNT_SETUP=True)
    def test_get_account_setup_public(self):
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
        self.client.force_authenticate(user=None)
        response = self.client.post(self.BASE_URL, data=payload, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Making sure that all objects are created
        self.assertEqual(Account.objects.count(), 1)
        self.assertEqual(DataSource.objects.count(), 1)
        self.assertEqual(SourceVersion.objects.count(), 1)
        self.assertEqual(User.objects.count(), 1)

        # Checking this after launching task
        # self.assertEqual(OrgUnitType.objects.count(), 3)  # country, region, province
        # self.assertEqual(OrgUnit.objects.count(), 14)
