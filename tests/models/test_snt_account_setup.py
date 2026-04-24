from django.core.files.uploadedfile import UploadedFile
from django.db import IntegrityError

from iaso.test import FileUploadToTestCase
from plugins.snt_malaria.models import SNTAccountSetup


class SNTAccountSetupTestCase(FileUploadToTestCase):
    JSON_FILE_NAME = "geo_json_be.json"
    JSON_FILE_PATH = f"plugins/snt_malaria/tests/fixtures/{JSON_FILE_NAME}"

    # TODO: use the real converted BE gpkg once it exists
    GPKG_FILE_NAME = "minimal.gpkg"
    GPKG_FILE_PATH = f"iaso/tests/fixtures/gpkg/{GPKG_FILE_NAME}"

    def test_create_object_with_all_fields(self):
        with open(self.JSON_FILE_PATH) as json_file:
            with open(self.GPKG_FILE_PATH, "rb") as gpkg_file:
                new_setup = SNTAccountSetup.objects.create(
                    username="test",
                    country="BE",
                    language="fr",
                    geo_json_file=UploadedFile(json_file),
                    account=self.account_1,
                    gpkg_file=UploadedFile(gpkg_file),
                )

        # mostly testing that there's no crash
        self.assertIsNotNone(new_setup.created_at)
        self.assertIsNotNone(new_setup.geo_json_file.file)
        self.assertIsNotNone(new_setup.gpkg_file.file)

    def test_error_account_already_has_a_snt_setup(self):
        with open(self.JSON_FILE_PATH) as json_file:
            SNTAccountSetup.objects.create(
                username="test",
                country="BE",
                language="fr",
                geo_json_file=UploadedFile(json_file),
                account=self.account_1,
            )

        # now let's try to create another setup with the same account
        with open(self.GPKG_FILE_PATH, "rb") as gpkg_file:
            with open(self.JSON_FILE_PATH, "rb") as json_file:
                with self.assertRaisesMessage(IntegrityError, "already exists"):
                    SNTAccountSetup.objects.create(
                        username="test2",
                        country="BE",
                        language="fr",
                        geo_json_file=UploadedFile(json_file),
                        account=self.account_1,
                        gpkg_file=UploadedFile(gpkg_file),
                    )

    def test_optional_fields(self):
        with open(f"{self.JSON_FILE_PATH}") as json_file:
            new_setup = SNTAccountSetup.objects.create(
                username="test",
                country="BE",
                geo_json_file=UploadedFile(json_file),
            )

        self.assertEqual(new_setup.language, "en")  # default value
        self.assertIsNone(new_setup.account)
        self.assertIsNone(new_setup.gpkg_file.name)  # can't assert on gpkg_file directly, it's a "FileField: None"

    def test_upload_to_files(self):
        with open(self.JSON_FILE_PATH) as json_file:
            with open(self.GPKG_FILE_PATH, "rb") as gpkg_file:
                new_setup = SNTAccountSetup.objects.create(
                    username="test",
                    country="BE",
                    language="fr",
                    geo_json_file=UploadedFile(json_file),
                    account=self.account_1,
                    gpkg_file=UploadedFile(gpkg_file),
                )

        expected_json_file_name = f"snt_account_setups/{new_setup.created_at.strftime('%Y_%m')}/{self.JSON_FILE_NAME}"
        self.assertEqual(new_setup.geo_json_file.name, expected_json_file_name)

        expected_gpkg_file_name = f"snt_account_setups/{new_setup.created_at.strftime('%Y_%m')}/{self.GPKG_FILE_NAME}"
        self.assertEqual(new_setup.gpkg_file.name, expected_gpkg_file_name)
