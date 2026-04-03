from unittest.mock import MagicMock, patch

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django_countries import countries
from rest_framework.exceptions import ValidationError

from iaso.models import Account, DataSource, Profile, Project, SourceVersion
from iaso.modules import MODULE_DEFAULT, MODULE_SNT_MALARIA
from iaso.permissions.core_permissions import CORE_METRIC_TYPES_PERMISSION
from iaso.test import TestCase
from plugins.snt_malaria.api.account_setup.utils import create_snt_account, transform_geo_json_to_gpkg
from plugins.snt_malaria.models import (
    BudgetSettings,
    Intervention,
    InterventionCategory,
    InterventionCostBreakdownLine,
    SNTAccountSetup,
)
from plugins.snt_malaria.permissions import (
    SNT_SCENARIO_BASIC_WRITE_PERMISSION,
    SNT_SCENARIO_FULL_WRITE_PERMISSION,
    SNT_SETTINGS_READ_PERMISSION,
    SNT_SETTINGS_WRITE_PERMISSION,
)


class SNTAccountSetupAPIUtilsTestCase(TestCase):
    JSON_FILE_NAME = "geo_json_be.json"
    JSON_FILE_PATH = f"plugins/snt_malaria/tests/fixtures/{JSON_FILE_NAME}"

    def setUp(self):
        self.username = "username"
        self.password = "password"
        self.country = "DE"
        self.language = "en"
        with open(self.JSON_FILE_PATH, "rb") as json_file:
            self.geo_json = SimpleUploadedFile(self.JSON_FILE_NAME, json_file.read(), content_type="application/json")

        countries_dict = dict(countries)
        self.full_country_name = countries_dict[self.country]

    def test_create_snt_account_happy_path(self):
        setup = create_snt_account(
            username=self.username,
            password=self.password,
            country=self.country,
            language=self.language,
            geo_json_file=self.geo_json,
        )

        self.assertEqual(SNTAccountSetup.objects.count(), 1)
        self.assertEqual(setup.username, self.username)
        self.assertEqual(setup.country, self.country)
        file_name_without_extension = self.JSON_FILE_NAME[:-5]
        self.assertIn(file_name_without_extension, setup.geo_json_file.name)

        self.assertEqual(Account.objects.count(), 1)
        account = Account.objects.first()
        self.assertIn(self.full_country_name, account.name)
        self.assertEqual(setup.account, account)
        self.assertCountEqual(account.modules, [MODULE_DEFAULT.codename, MODULE_SNT_MALARIA.codename])

        self.assertEqual(DataSource.objects.count(), 1)
        data_source = DataSource.objects.first()
        self.assertIn(self.full_country_name, data_source.name)

        self.assertEqual(SourceVersion.objects.count(), 1)
        source_version = SourceVersion.objects.first()
        self.assertEqual(source_version.number, 1)
        self.assertEqual(source_version.data_source, data_source)
        self.assertEqual(account.default_version, source_version)

        self.assertEqual(Project.objects.count(), 1)
        project = Project.objects.first()
        self.assertEqual("Main project", project.name)
        self.assertEqual(list(project.data_sources.all()), [data_source])

        self.assertEqual(User.objects.count(), 1)
        user = User.objects.first()
        self.assertEqual(user.username, self.username)
        self.assertTrue(user.check_password(self.password))
        self.assertTrue(hasattr(user, "iaso_profile"))
        for perm in [
            SNT_SETTINGS_READ_PERMISSION,
            SNT_SETTINGS_WRITE_PERMISSION,
            SNT_SCENARIO_BASIC_WRITE_PERMISSION,
            SNT_SCENARIO_FULL_WRITE_PERMISSION,
            CORE_METRIC_TYPES_PERMISSION,
        ]:
            self.assertTrue(user.has_perm(perm.full_name()))

        self.assertEqual(Profile.objects.count(), 1)
        profile = Profile.objects.first()
        self.assertEqual(profile.user, user)
        self.assertEqual(profile.account, account)
        self.assertEqual(profile.language, self.language)

        self.assertEqual(BudgetSettings.objects.filter(account=account).count(), 1)
        # see intervention_seeder.py to understand why these values
        self.assertEqual(InterventionCategory.objects.filter(account=account).count(), 8)
        self.assertEqual(Intervention.objects.count(), 21)
        self.assertEqual(InterventionCostBreakdownLine.objects.count(), 27)

    @patch("plugins.snt_malaria.api.account_setup.utils.uuid")
    def test_create_snt_account_error_data_source_already_taken(self, mock_uuid):
        magic_mock_hex = MagicMock()
        magic_mock_hex.hex = "0123456789"
        mock_uuid.uuid4.return_value = magic_mock_hex
        expected_account_name = f"{self.full_country_name}-{magic_mock_hex.hex}"

        DataSource.objects.create(
            name=expected_account_name,
        )

        with self.assertRaisesMessage(
            ValidationError, f"A data source already exists with the name {expected_account_name}"
        ):
            create_snt_account(
                username=self.username,
                password=self.password,
                country=self.country,
                language=self.language,
                geo_json_file=self.geo_json,
            )

    @patch("plugins.snt_malaria.api.account_setup.utils.uuid")
    def test_create_snt_account_error_account_already_taken(self, mock_uuid):
        magic_mock_hex = MagicMock()
        magic_mock_hex.hex = "0123456789"
        mock_uuid.uuid4.return_value = magic_mock_hex
        expected_account_name = f"{self.full_country_name}-{magic_mock_hex.hex}"

        Account.objects.create(
            name=expected_account_name,
        )

        with self.assertRaisesMessage(
            ValidationError, f"An account already exists with the name {expected_account_name}"
        ):
            create_snt_account(
                username=self.username,
                password=self.password,
                country=self.country,
                language=self.language,
                geo_json_file=self.geo_json,
            )

    def test_create_snt_account_error_username_already_taken(self):
        User.objects.create(username=self.username)

        with self.assertRaisesMessage(ValidationError, f"The username {self.username} is already taken"):
            create_snt_account(
                username=self.username,
                password=self.password,
                country=self.country,
                language=self.language,
                geo_json_file=self.geo_json,
            )

    def test_transform_geo_json_to_gpkg(self):
        setup = SNTAccountSetup.objects.create(
            username=self.username,
            country=self.country,
            geo_json_file=self.geo_json,
        )

        self.assertIsNone(setup.gpkg_file.name)

        transform_geo_json_to_gpkg(setup)

        self.assertIsNotNone(setup.gpkg_file.name)
        self.assertIn(".gpkg", setup.gpkg_file.name)
