from unittest.mock import Mock

from plugins.snt_malaria.api.scenario_rules.serializers import (
    ScenarioRuleListSerializer,
    ScenarioRuleQuerySerializer,
    ScenarioRuleRetrieveSerializer,
)
from plugins.snt_malaria.models import ScenarioRule
from plugins.snt_malaria.tests.api.scenario_rules.common_base import ScenarioRulesTestBase


class ScenarioRuleQuerySerializerTestCase(ScenarioRulesTestBase):
    def setUp(self):
        super().setUp()
        self.context = {"request": Mock(user=self.user_with_full_perm)}

    def test_happy_path(self):
        data = {
            "scenario": self.scenario.id,
        }
        serializer = ScenarioRuleQuerySerializer(data=data, context=self.context)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data["scenario"], self.scenario)

    def test_unknown_scenario(self):
        data = {
            "scenario": 9999,
        }
        serializer = ScenarioRuleQuerySerializer(data=data, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("scenario", serializer.errors)
        self.assertIn(f'Invalid pk "{data["scenario"]}"', serializer.errors["scenario"][0])

    def test_scenario_from_another_account(self):
        data = {
            "scenario": self.other_scenario.id,
        }
        serializer = ScenarioRuleQuerySerializer(data=data, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("scenario", serializer.errors)
        self.assertIn(f'Invalid pk "{data["scenario"]}"', serializer.errors["scenario"][0])

    def test_missing_scenario_field(self):
        data = {}
        serializer = ScenarioRuleQuerySerializer(data=data, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("scenario", serializer.errors)
        self.assertIn("This field is required.", serializer.errors["scenario"][0])

    def test_blank_scenario_field(self):
        data = {"scenario": ""}
        serializer = ScenarioRuleQuerySerializer(data=data, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("scenario", serializer.errors)
        self.assertIn("This field may not be null.", serializer.errors["scenario"][0])


class ScenarioRuleListSerializerTestCase(ScenarioRulesTestBase):
    def test_happy_path(self):
        queryset = ScenarioRule.objects.filter(scenario=self.scenario).order_by("id")
        serializer = ScenarioRuleListSerializer(queryset, many=True)
        data = serializer.data
        self.assertEqual(len(data), 2)

        rule = data[0]
        self.assertEqual(rule["id"], self.scenario_rule_1.id)
        self.assertEqual(rule["scenario"], self.scenario.id)
        self.assertEqual(rule["name"], self.scenario_rule_1.name)
        self.assertEqual(rule["priority"], self.scenario_rule_1.priority)
        self.assertEqual(rule["color"], self.scenario_rule_1.color)
        self.assertEqual(rule["matching_criteria"], self.scenario_rule_1.matching_criteria)
        self.assertEqual(rule["org_units_matched"], self.scenario_rule_1.org_units_matched)
        self.assertEqual(rule["org_units_excluded"], self.scenario_rule_1.org_units_excluded)
        self.assertEqual(rule["org_units_included"], self.scenario_rule_1.org_units_included)
        self.assertEqual(rule["org_units_scope"], self.scenario_rule_1.org_units_scope)
        self.assertEqual(
            rule["interventions"],
            [
                {
                    "intervention": self.rule_intervention_1.intervention.id,
                    "coverage": f"{self.rule_intervention_1.coverage:.2f}",
                },
                {
                    "intervention": self.rule_intervention_2.intervention.id,
                    "coverage": f"{self.rule_intervention_2.coverage:.2f}",
                },
            ],
        )

        rule_2 = data[1]
        self.assertEqual(rule_2["id"], self.scenario_rule_2.id)
        self.assertEqual(rule_2["scenario"], self.scenario.id)
        self.assertEqual(rule_2["name"], self.scenario_rule_2.name)
        self.assertEqual(rule_2["priority"], self.scenario_rule_2.priority)
        self.assertEqual(rule_2["color"], self.scenario_rule_2.color)
        self.assertEqual(rule_2["matching_criteria"], self.scenario_rule_2.matching_criteria)
        self.assertEqual(rule_2["org_units_matched"], self.scenario_rule_2.org_units_matched)
        self.assertEqual(rule_2["org_units_excluded"], self.scenario_rule_2.org_units_excluded)
        self.assertEqual(rule_2["org_units_included"], self.scenario_rule_2.org_units_included)
        self.assertEqual(rule_2["org_units_scope"], self.scenario_rule_2.org_units_scope)
        self.assertEqual(
            rule_2["interventions"],
            [
                {
                    "intervention": self.rule_intervention_3.intervention.id,
                    "coverage": f"{self.rule_intervention_3.coverage:.2f}",
                },
            ],
        )


class ScenarioRuleRetrieveSerializerTestCase(ScenarioRulesTestBase):
    def test_happy_path(self):
        serializer = ScenarioRuleRetrieveSerializer(instance=self.scenario_rule_1)
        data = serializer.data
        self.assertEqual(data["id"], self.scenario_rule_1.id)
        self.assertEqual(data["scenario"], self.scenario_rule_1.scenario.id)
        self.assertEqual(data["name"], self.scenario_rule_1.name)
        self.assertEqual(data["priority"], self.scenario_rule_1.priority)
        self.assertEqual(data["color"], self.scenario_rule_1.color)
        self.assertEqual(data["matching_criteria"], self.scenario_rule_1.matching_criteria)
        self.assertEqual(data["org_units_matched"], self.scenario_rule_1.org_units_matched)
        self.assertEqual(data["org_units_excluded"], self.scenario_rule_1.org_units_excluded)
        self.assertEqual(data["org_units_included"], self.scenario_rule_1.org_units_included)
        self.assertEqual(data["org_units_scope"], self.scenario_rule_1.org_units_scope)
        self.assertEqual(
            data["interventions"],
            [
                {
                    "intervention": self.rule_intervention_1.intervention.id,
                    "coverage": f"{self.rule_intervention_1.coverage:.2f}",
                },
                {
                    "intervention": self.rule_intervention_2.intervention.id,
                    "coverage": f"{self.rule_intervention_2.coverage:.2f}",
                },
            ],
        )
        self.assertEqual(data["created_by"], self.scenario_rule_1.created_by_id)
        self.assertIsNone(data["updated_by"])
        # don't care about the timestamp value, just want to know that it's there
        self.assertIsNotNone(data["created_at"])
        self.assertIsNotNone(data["updated_at"])
