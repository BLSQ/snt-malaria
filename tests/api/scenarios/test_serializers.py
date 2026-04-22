from unittest.mock import Mock

from iaso.models import Account
from iaso.test import TestCase
from plugins.snt_malaria.api.scenarios.serializers import (
    ScenarioRulesReorderSerializer,
    ScenarioWriteSerializer,
)
from plugins.snt_malaria.models import Scenario, ScenarioRule
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

    def test_update_if_is_locked(self):
        self.scenario.is_locked = True
        self.scenario.save()

        payload = {
            "name": "Updated Name",
            "description": "Updated description.",
            "start_year": 2025,
            "end_year": 2026,
            "is_locked": False,
        }
        serializer = ScenarioWriteSerializer(instance=self.scenario, data=payload, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("non_field_errors", serializer.errors)
        self.assertIn("Cannot modify a locked scenario.", serializer.errors["non_field_errors"])

    def test_update_is_locked_field(self):
        self.scenario.is_locked = True
        self.scenario.save()

        payload = {
            "is_locked": False,
        }
        serializer = ScenarioWriteSerializer(instance=self.scenario, data=payload, context=self.context, partial=True)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        updated_scenario = serializer.save()
        self.assertFalse(updated_scenario.is_locked)


class ScenarioReorderRulesSerializerTestCase(BaseSerializerTestCase):
    def setUp(self):
        super().setUp()
        self.rule_1 = ScenarioRule.objects.create(
            scenario=self.scenario,
            name="Test Rule",
            color="#FF0000",
            matching_criteria={"and": [{"==": [{"var": 1}, 1]}]},
            priority=1,
            created_by=self.user_with_basic_perm,
        )
        self.rule_2 = ScenarioRule.objects.create(
            scenario=self.scenario,
            name="Test Rule 2",
            color="#00FF00",
            matching_criteria={"and": [{"==": [{"var": 1}, 1]}]},
            priority=2,
            created_by=self.user_with_basic_perm,
        )
        self.context["scenario"] = self.scenario

    def test_reorder_on_locked_scenario(self):
        self.scenario.is_locked = True
        self.scenario.save()

        payload = {
            "new_order": [self.rule_2.id, self.rule_1.id],
        }
        serializer = ScenarioRulesReorderSerializer(data=payload, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("new_order", serializer.errors)
        self.assertIn("Cannot reorder rules for a locked scenario.", serializer.errors["new_order"])

    def test_reorder_with_valid_data(self):
        payload = {
            "new_order": [self.rule_2.id, self.rule_1.id],
        }
        serializer = ScenarioRulesReorderSerializer(data=payload, context=self.context)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_reorder_with_missing_rule(self):
        payload = {
            "new_order": [self.rule_2.id],
        }
        serializer = ScenarioRulesReorderSerializer(data=payload, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("new_order", serializer.errors)
        self.assertIn(
            f"Missing rule IDs that belong to the scenario - {{{self.rule_1.id}}}", serializer.errors["new_order"]
        )


class ScenarioRulesSerializerTestCase(BaseSerializerTestCase):
    def setUp(self):
        super().setUp()
        self.rule_1 = ScenarioRule.objects.create(
            scenario=self.scenario,
            name="Test Rule",
            color="#FF0000",
            matching_criteria={"and": [{"==": [{"var": 1}, 1]}]},
            priority=1,
            created_by=self.user_with_basic_perm,
        )
        self.rule_2 = ScenarioRule.objects.create(
            scenario=self.scenario,
            name="Test Rule 2",
            color="#00FF00",
            matching_criteria={"and": [{"==": [{"var": 1}, 1]}]},
            priority=2,
            created_by=self.user_with_basic_perm,
        )
        self.context["scenario"] = self.scenario

    def test_happy_path(self):
        payload = {
            "new_order": [self.rule_2.id, self.rule_1.id],
        }
        serializer = ScenarioRulesReorderSerializer(data=payload, context=self.context)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_missing_rule(self):
        payload = {
            "new_order": [self.rule_2.id],
        }
        serializer = ScenarioRulesReorderSerializer(data=payload, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("new_order", serializer.errors)
        self.assertIn(
            f"Missing rule IDs that belong to the scenario - {{{self.rule_1.id}}}", serializer.errors["new_order"]
        )

    def test_extra_rule(self):
        another_scenario = Scenario.objects.create(
            account=self.account,
            created_by=self.user_with_basic_perm,
            name="Another Scenario",
            description="Another scenario description.",
            start_year=2025,
            end_year=2026,
        )
        extra_rule = ScenarioRule.objects.create(
            scenario=another_scenario,
            name="Extra Rule",
            color="#0000FF",
            matching_criteria={"and": [{"==": [{"var": 1}, 1]}]},
            priority=1,
            created_by=self.user_with_basic_perm,
        )
        payload = {
            "new_order": [self.rule_1.id, self.rule_2.id, extra_rule.id],
        }
        serializer = ScenarioRulesReorderSerializer(data=payload, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("new_order", serializer.errors)
        self.assertIn(f'Invalid pk "{extra_rule.id}"', serializer.errors["new_order"][0])

    def test_new_order_missing(self):
        payload = {}
        serializer = ScenarioRulesReorderSerializer(data=payload, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("new_order", serializer.errors)
        self.assertIn("This field is required.", serializer.errors["new_order"])

    def test_new_order_empty(self):
        payload = {
            "new_order": [],
        }
        serializer = ScenarioRulesReorderSerializer(data=payload, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("new_order", serializer.errors)
        error = serializer.errors["new_order"][0]
        self.assertIn("Missing rule IDs that belong to the scenario - ", error)
        self.assertIn(str(self.rule_1.id), error)
        self.assertIn(str(self.rule_2.id), error)
