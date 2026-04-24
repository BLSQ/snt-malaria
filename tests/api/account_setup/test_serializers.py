from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile

from iaso.test import PasswordValidationTestMixin, TestCase
from plugins.snt_malaria.api.account_setup.serializers import SNTAccountSetupSerializer


class SNTAccountSetupSerializerTestCase(TestCase, PasswordValidationTestMixin):
    JSON_FILE_NAME = "geo_json_be.json"
    JSON_FILE_PATH = f"plugins/snt_malaria/tests/fixtures/{JSON_FILE_NAME}"

    def test_happy_path(self):
        with open(self.JSON_FILE_PATH, "rb") as json_file:
            data = {
                "username": "username",
                "password": "secret-password-very-secure-much-wow",
                "password_confirmation": "secret-password-very-secure-much-wow",
                "country": "BE",
                "language": "en",
                "geo_json_file": SimpleUploadedFile(
                    self.JSON_FILE_NAME, json_file.read(), content_type="application/json"
                ),
            }
        serializer = SNTAccountSetupSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_password_confirmation_mismatch(self):
        with open(self.JSON_FILE_PATH, "rb") as json_file:
            data = {
                "username": "username",
                "password": "secret-password-very-secure-much-wow",
                "password_confirmation": "not-the-same-password",
                "country": "DE",
                "language": "fr",
                "geo_json_file": SimpleUploadedFile(
                    self.JSON_FILE_NAME, json_file.read(), content_type="application/json"
                ),
            }
        serializer = SNTAccountSetupSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("Passwords do not match", serializer.errors["non_field_errors"][0])

    def test_existing_username(self):
        user_bouboule = User.objects.create_user(username="bouboule", password="password")
        with open(self.JSON_FILE_PATH, "rb") as json_file:
            data = {
                "username": user_bouboule.username,
                "password": "secret-password-very-secure-much-wow",
                "password_confirmation": "secret-password-very-secure-much-wow",
                "country": "BE",
                "language": "fr",
                "geo_json_file": SimpleUploadedFile(
                    self.JSON_FILE_NAME, json_file.read(), content_type="application/json"
                ),
            }
        serializer = SNTAccountSetupSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        errors = serializer.errors
        self.assertIn("username", errors)
        self.assertIn("Username already exists", errors["username"][0])

    def test_optional_fields(self):
        with open(self.JSON_FILE_PATH, "rb") as json_file:
            data = {
                "username": "username",
                "password": "secret-password-very-secure-much-wow",
                "password_confirmation": "secret-password-very-secure-much-wow",
                "country": "BE",
                # language is missing
                "geo_json_file": SimpleUploadedFile(
                    self.JSON_FILE_NAME, json_file.read(), content_type="application/json"
                ),
            }
        serializer = SNTAccountSetupSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_missing_fields(self):
        data = {}
        serializer = SNTAccountSetupSerializer(data=data)
        self.assertFalse(serializer.is_valid())

        errors = serializer.errors
        self.assertIn("username", errors)
        self.assertIn("This field is required.", errors["username"][0])
        self.assertIn("password", errors)
        self.assertIn("This field is required.", errors["password"][0])
        self.assertIn("password_confirmation", errors)
        self.assertIn("This field is required.", errors["password_confirmation"][0])
        self.assertIn("country", errors)
        self.assertIn("This field is required.", errors["country"][0])
        self.assertIn("geo_json_file", errors)
        self.assertIn("No file was submitted.", errors["geo_json_file"][0])

        # optional
        self.assertNotIn("language", errors)

    def test_blank_fields(self):
        with open(self.JSON_FILE_PATH, "rb") as json_file:
            data = {
                "username": "",
                "password": "",
                "password_confirmation": "",
                "country": "",
                "language": "",
                "geo_json_file": SimpleUploadedFile(
                    self.JSON_FILE_NAME, json_file.read(), content_type="application/json"
                ),
            }
        serializer = SNTAccountSetupSerializer(data=data)
        self.assertFalse(serializer.is_valid())

        errors = serializer.errors
        self.assertIn("username", errors)
        self.assertIn("This field may not be blank", errors["username"][0])
        self.assertIn("password", errors)
        self.assertIn("This field may not be blank", errors["password"][0])
        self.assertIn("password_confirmation", errors)
        self.assertIn("This field may not be blank", errors["password_confirmation"][0])

        # values from dropdown lists
        self.assertIn("country", errors)
        self.assertIn("is not a valid choice", errors["country"][0])
        self.assertIn("language", errors)
        self.assertIn("is not a valid choice", errors["language"][0])

    def test_invalid_file_format(self):
        with open("iaso/tests/fixtures/hydro.xml", "rb") as xml_file:
            data = {
                "username": "username",
                "password": "secret-password-very-secure-much-wow",
                "password_confirmation": "secret-password-very-secure-much-wow",
                "country": "BE",
                "language": "fr",
                "geo_json_file": SimpleUploadedFile("hydro.xml", xml_file.read(), content_type="application/xml"),
            }
        serializer = SNTAccountSetupSerializer(data=data)
        self.assertFalse(serializer.is_valid())

        errors = serializer.errors
        self.assertIn("geo_json_file", errors)
        self.assertIn("GeoJSON file must end with '.json' or '.geojson'", errors["geo_json_file"][0])

    def test_invalid_file_missing_features(self):
        with open("plugins/snt_malaria/tests/fixtures/geo_json_be_no_features.json", "rb") as json_file:
            data = {
                "username": "username",
                "password": "secret-password-very-secure-much-wow",
                "password_confirmation": "secret-password-very-secure-much-wow",
                "country": "BE",
                "language": "fr",
                "geo_json_file": SimpleUploadedFile("file.json", json_file.read(), content_type="application/json"),
            }
        serializer = SNTAccountSetupSerializer(data=data)
        self.assertFalse(serializer.is_valid())

        errors = serializer.errors
        self.assertIn("geo_json_file", errors)
        self.assertIn(
            "GeoJSON file must contain 'features' key",
            errors["geo_json_file"][0],
        )

    def test_invalid_file_missing_keys(self):
        """
        The ADMx_ID, ADMx_NAME keys are not in the file, even if the values are there (they have another name)
        """
        with open("plugins/snt_malaria/tests/fixtures/geo_json_be_missing_keys.json", "rb") as json_file:
            data = {
                "username": "username",
                "password": "secret-password-very-secure-much-wow",
                "password_confirmation": "secret-password-very-secure-much-wow",
                "country": "BE",
                "language": "fr",
                "geo_json_file": SimpleUploadedFile("file.json", json_file.read(), content_type="application/json"),
            }
        serializer = SNTAccountSetupSerializer(data=data)
        self.assertFalse(serializer.is_valid())

        errors = serializer.errors
        self.assertIn("geo_json_file", errors)
        self.assertIn(
            "Locations in the GeoJSON file lack required properties: ['ADM0_ID', 'ADM0_NAME', 'ADM1_ID', 'ADM1_NAME', 'ADM1_LEVEL_NAME', 'ADM2_ID', 'ADM2_NAME', 'ADM2_LEVEL_NAME']",
            errors["geo_json_file"][0],
        )

    def test_password_validation_error_too_short_too_common(self):
        with open(self.JSON_FILE_PATH, "rb") as json_file:
            data = {
                "username": "username",
                "password": "secret",
                "password_confirmation": "secret",
                "country": "BE",
                "geo_json_file": SimpleUploadedFile(
                    self.JSON_FILE_NAME, json_file.read(), content_type="application/json"
                ),
            }
        serializer = SNTAccountSetupSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        errors = serializer.errors
        self.assertIn("password", errors)
        self.assertIn(self.ERROR_PASSWORD_TOO_COMMON, errors["password"])
        self.assertIn(self.ERROR_PASSWORD_TOO_SHORT, errors["password"])

    def test_password_validation_error_too_similar_username(self):
        with open(self.JSON_FILE_PATH, "rb") as json_file:
            data = {
                "username": "username",
                "password": "username4",
                "password_confirmation": "username4",
                "country": "BE",
                "geo_json_file": SimpleUploadedFile(
                    self.JSON_FILE_NAME, json_file.read(), content_type="application/json"
                ),
            }
        serializer = SNTAccountSetupSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        errors = serializer.errors
        self.assertIn("password", errors)
        self.assertIn(self.ERROR_PASSWORD_TOO_SIMILAR_USERNAME, errors["password"])

    def test_password_validation_error_not_only_numeric(self):
        with open(self.JSON_FILE_PATH, "rb") as json_file:
            data = {
                "username": "username",
                "password": "012345679887654054065198",
                "password_confirmation": "012345679887654054065198",
                "country": "BE",
                "geo_json_file": SimpleUploadedFile(
                    self.JSON_FILE_NAME, json_file.read(), content_type="application/json"
                ),
            }
        serializer = SNTAccountSetupSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        errors = serializer.errors
        self.assertIn("password", errors)
        self.assertIn(self.ERROR_PASSWORD_NUMERIC, errors["password"])
