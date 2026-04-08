from unittest.mock import patch

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework import status
from rest_framework.exceptions import ValidationError

from iaso.models import Account, DataSource, ImportGPKG, OrgUnit, OrgUnitType, Profile, Project, SourceVersion, Task
from iaso.permissions.core_permissions import CORE_DATA_TASKS_PERMISSION
from iaso.tests.tasks.task_api_test_case import TaskAPITestCase
from plugins.snt_malaria.models import BudgetSettings, Intervention, InterventionCategory, InterventionCostBreakdownLine


class SNTAccountSetupAPITestCase(TaskAPITestCase):
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
        result = self.assertJSONResponse(response, status.HTTP_201_CREATED)

        # Making sure that all objects related to the new account are created
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

        # Checking if the import task was launched with the right parameters
        self.assertEqual(Task.objects.count(), 1)
        self.assertEqual(ImportGPKG.objects.count(), 1)

        task_data = result["task"]
        task = self.assertValidTaskAndInDB(task_data, status="QUEUED", name="import_gpkg_task")
        new_user = User.objects.first()
        import_gpkg = ImportGPKG.objects.first()

        self.assertEqual(task.launcher, new_user)
        self.assertEqual(task.params["kwargs"]["import_gpkg_id"], import_gpkg.id)

        # since self.runAndValidateTask() calls the API to check the task result, we need to have a logged in user
        # otherwise it results in a 401 error, so here's a user that logs in only for calling this endpoint
        # it doesn't interfere with the anonymous setup call, which is already done
        new_account = Account.objects.first()
        task_admin = self.create_user_with_profile(
            username="task_admin", account=new_account, permissions=[CORE_DATA_TASKS_PERMISSION]
        )
        self.client.force_authenticate(task_admin)
        self.runAndValidateTask(task, "SUCCESS")

        task.refresh_from_db()
        # there's 1 country + 3 regions + 11 provinces (should 10, but since the shape file is flat, there's no region if you don't provide a province)
        self.assertIn("Imported 15 OrgUnits", task.progress_message)

        # Checking import gpkg result
        self.assertEqual(OrgUnitType.objects.count(), 3)  # country, region, province
        self.assertEqual(OrgUnit.objects.count(), 15)  # 1 country + 3 regions + 11 provinces

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
        """
        Makes sure that nothing is saved when creating the account raises an error
        """
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
    def test_post_account_setup_error_transform_atomic(self, mock_geo_json_transform):
        """
        Makes sure that nothing is saved when transforming the geo json file raises an error
        """
        mock_geo_json_transform.side_effect = ValueError("something happened while processing the geo json file")

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
        self.assertContains(
            response,
            "There was an unexpected error, please ask an administrator to check the server logs",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

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
