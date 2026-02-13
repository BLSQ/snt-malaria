from unittest.mock import Mock

from iaso.models import Account
from iaso.test import TestCase
from plugins.snt_malaria.api.scenarios.serializers import DuplicateScenarioSerializer, ScenarioWriteSerializer
from plugins.snt_malaria.models import Scenario
from plugins.snt_malaria.permissions import SNT_SCENARIO_BASIC_WRITE_PERMISSION


class BaseSerializerTestCase(TestCase):
    def setUp(self):
        self.account = Account.objects.create(name="Test Account")
        self.user_with_basic_perm = self.create_user_with_profile(
            username="testuserbasic", account=self.account, permissions=[SNT_SCENARIO_BASIC_WRITE_PERMISSION]
        )
        self.scenario = Scenario.objects.create(
            account=self.account,
            created_by=self.user_with_basic_perm,
            name="Test Scenario",
            description="A test scenario description.",
            start_year=2025,
            end_year=2026,
        )
        self.context = {"request": Mock(user=self.user_with_basic_perm)}


class DuplicateScenarioSerializerTestCase(BaseSerializerTestCase):
    def test_ok(self):
        payload = {
            "scenario_to_duplicate": self.scenario.id,
            "name": "Duplicated Scenario",
            "description": "A duplicated scenario description.",
            "start_year": 2025,
            "end_year": 2026,
        }
        serializer = DuplicateScenarioSerializer(data=payload, context=self.context)
        self.assertTrue(serializer.is_valid())
        self.assertEqual(serializer.validated_data["scenario_to_duplicate"], self.scenario)

    def test_missing_fields(self):
        serializer = DuplicateScenarioSerializer(data={}, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("scenario_to_duplicate", serializer.errors)
        self.assertIn("This field is required.", serializer.errors["scenario_to_duplicate"])
        self.assertIn("name", serializer.errors)
        self.assertIn("This field is required.", serializer.errors["name"])
        self.assertIn("start_year", serializer.errors)
        self.assertIn("This field is required.", serializer.errors["start_year"])
        self.assertIn("end_year", serializer.errors)
        self.assertIn("This field is required.", serializer.errors["end_year"])

    def test_scenario_from_another_account(self):
        another_account = Account.objects.create(name="Another Account")
        user_from_another_account = self.create_user_with_profile(
            username="anotheruser", account=another_account, permissions=[SNT_SCENARIO_BASIC_WRITE_PERMISSION]
        )
        scenario_from_another_account = Scenario.objects.create(
            account=another_account,
            created_by=user_from_another_account,
            name="Another Account Scenario",
            description="A scenario from another account.",
            start_year=2025,
            end_year=2026,
        )
        payload = {
            "scenario_to_duplicate": scenario_from_another_account.id,
            "name": "Duplicated Scenario",
            "description": "A duplicated scenario description.",
            "start_year": 2025,
            "end_year": 2026,
        }
        serializer = DuplicateScenarioSerializer(data=payload, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("scenario_to_duplicate", serializer.errors)
        self.assertIn(f'Invalid pk "{scenario_from_another_account.id}"', serializer.errors["scenario_to_duplicate"][0])


class ScenarioWriteSerializerTestCase(BaseSerializerTestCase):
    def test_blank_name(self):
        payload = {
            "name": "",
            "description": "A duplicated scenario description.",
            "start_year": 2025,
            "end_year": 2026,
        }
        serializer = ScenarioWriteSerializer(data=payload, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("name", serializer.errors)
        self.assertIn("This field may not be blank.", serializer.errors["name"])

    def test_start_year_greater_than_end_year(self):
        payload = {
            "name": "Invalid Scenario",
            "description": "A duplicated scenario description.",
            "start_year": 2027,
            "end_year": 2026,
        }
        serializer = ScenarioWriteSerializer(data=payload, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("start_year", serializer.errors)
        self.assertIn("Start year should be lower or equal end year.", serializer.errors["start_year"])

    def test_start_year_before_2024(self):
        payload = {
            "name": "Invalid Scenario",
            "description": "A duplicated scenario description.",
            "start_year": 2023,
            "end_year": 2026,
        }
        serializer = ScenarioWriteSerializer(data=payload, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("start_year", serializer.errors)
        self.assertIn("Start year must be between 2024 and 2035.", serializer.errors["start_year"])

    def test_start_year_after_2035(self):
        payload = {
            "name": "Invalid Scenario",
            "description": "A duplicated scenario description.",
            "start_year": 2036,
            "end_year": 2037,
        }
        serializer = ScenarioWriteSerializer(data=payload, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("start_year", serializer.errors)
        self.assertIn("Start year must be between 2024 and 2035.", serializer.errors["start_year"])

    def test_name_already_taken(self):
        payload = {
            "name": self.scenario.name,
            "description": "Name already taken",
            "start_year": 2025,
            "end_year": 2026,
        }
        serializer = ScenarioWriteSerializer(data=payload, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("name", serializer.errors)
        self.assertIn("A scenario with this name already exists for your account.", serializer.errors["name"])
