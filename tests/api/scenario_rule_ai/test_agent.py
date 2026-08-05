import json

from unittest.mock import patch

from django.test import SimpleTestCase
from pydantic import ValidationError

from plugins.snt_malaria.api.scenario_rule_ai.agent import (
    build_system_prompt,
    generate_scenario_rules,
    parse_scenario_rules_response,
)


METRIC_TYPES = [
    {"id": 1, "name": "Incidence", "description": "Malaria incidence"},
    {"id": 2, "name": "Rainfall", "description": ""},
]
INTERVENTIONS = [
    {"id": 10, "name": "Bednets", "category_name": "Vector control"},
    {"id": 11, "name": "SMC", "category_name": "Preventive Chemotherapy"},
]


class BuildSystemPromptTestCase(SimpleTestCase):
    def test_catalogs_placeholder_is_replaced(self):
        prompt = build_system_prompt(METRIC_TYPES, INTERVENTIONS)

        self.assertNotIn("{metric_types_catalog}", prompt)
        self.assertNotIn("{interventions_catalog}", prompt)
        self.assertIn('- id=1, name="Incidence", description="Malaria incidence"', prompt)
        self.assertIn('- id=2, name="Rainfall"', prompt)
        self.assertIn("Vector control:", prompt)
        self.assertIn('- id=10, name="Bednets"', prompt)

    def test_empty_catalogs(self):
        prompt = build_system_prompt([], [])

        self.assertIn("(no data layers available for this account)", prompt)
        self.assertIn("(no interventions available for this account)", prompt)

    def test_priority_merge_vs_conflict_semantics_are_explained(self):
        # Matches Scenario.refresh_assignments/ScenarioRule.refresh_assignments (models/scenario.py):
        # different categories always merge; same category is won by the highest-priority rule; two
        # interventions of the same category within one rule leave only the first actually assigned.
        prompt = build_system_prompt(METRIC_TYPES, INTERVENTIONS)

        self.assertIn("last rule in the list has the highest priority", prompt)
        self.assertIn("DIFFERENT intervention categories are always merged", prompt)
        self.assertIn("SAME intervention category conflict", prompt)
        self.assertIn("only the highest-priority rule's", prompt)
        self.assertIn("Never assign two interventions from the same category within a single rule", prompt)

    def test_message_field_instructs_names_not_ids(self):
        # Regression: the model was writing ids in parentheses to disambiguate two catalog entries
        # with the same name (e.g. "'TEST' (id 97)") - the instruction must explicitly forbid that,
        # not just say "use names," and give it another way to disambiguate.
        prompt = build_system_prompt(METRIC_TYPES, INTERVENTIONS)

        self.assertIn("never write a numeric id", prompt)
        self.assertIn("not even in parentheses", prompt)
        self.assertIn("share the exact same name", prompt)

    def test_rule_name_instructed_to_describe_action_not_criteria(self):
        # Regression: the model was naming rules after their matching_criteria (e.g. "High risk
        # areas" for a "Risk stratification == Elevée" rule), which just repeats what the UI already
        # shows next to the name - the name should instead say what the rule does.
        prompt = build_system_prompt(METRIC_TYPES, INTERVENTIONS)

        self.assertIn("describe what the rule DOES", prompt)
        self.assertIn("not restate its `matching_criteria`", prompt)

    def test_ordinal_metric_type_lists_valid_categories(self):
        metric_types = [
            {
                "id": 3,
                "name": "Incidence category",
                "description": "",
                "legend_type": "ordinal",
                "legend_config": {"domain": ["Low", "Medium", "High"], "range": ["#fff", "#aaa", "#000"]},
            }
        ]

        prompt = build_system_prompt(metric_types, [])

        self.assertIn('categorical - valid values: ["Low", "Medium", "High"]', prompt)
        self.assertIn('use operator "=="', prompt)

    def test_numeric_metric_type_lists_typical_range(self):
        metric_types = [
            {
                "id": 1,
                "name": "Incidence",
                "description": "",
                "legend_type": "threshold",
                "legend_config": {"domain": [0, 100, 200, 500], "range": ["#fff", "#aaa", "#000", "#111"]},
            }
        ]

        prompt = build_system_prompt(metric_types, [])

        self.assertIn("typical value range: 0 to 500", prompt)

    def test_metric_type_without_legend_config_has_no_range_or_categories(self):
        prompt = build_system_prompt(METRIC_TYPES, [])

        self.assertNotIn("typical value range", prompt)
        self.assertNotIn("categorical - valid values", prompt)

    def test_json_schema_braces_survive_substitution(self):
        prompt = build_system_prompt(METRIC_TYPES, INTERVENTIONS)

        self.assertIn('"rules": [', prompt)
        self.assertIn('"message": "<your explanation', prompt)

    def test_current_rules_section_appended(self):
        current_rules = [
            {"id": 1, "name": "High incidence", "is_match_all": False, "matching_criteria": [], "interventions": [10]}
        ]

        prompt = build_system_prompt(METRIC_TYPES, INTERVENTIONS, current_rules=current_rules)

        self.assertIn("## Current rules for this scenario", prompt)
        self.assertIn(json.dumps(current_rules, indent=2), prompt)

    def test_no_current_rules_section_when_absent(self):
        prompt = build_system_prompt(METRIC_TYPES, INTERVENTIONS, current_rules=None)

        self.assertNotIn("## Current rules for this scenario", prompt)


RULES_RESPONSE = {
    "rules": [
        {
            "id": None,
            "name": "High incidence",
            "is_match_all": False,
            "matching_criteria": [{"metric_type": 1, "operator": ">", "value": 400}],
            "interventions": [10],
        }
    ],
    "message": "Created a rule for high incidence districts.",
}
RULES_RESPONSE_JSON = json.dumps(RULES_RESPONSE)


class ParseScenarioRulesResponseTestCase(SimpleTestCase):
    def test_plain_json_with_no_fence(self):
        parsed = parse_scenario_rules_response(RULES_RESPONSE_JSON)

        self.assertEqual(parsed.message, RULES_RESPONSE["message"])
        self.assertEqual(parsed.rules[0].name, "High incidence")

    def test_json_code_fence(self):
        parsed = parse_scenario_rules_response(f"```json\n{RULES_RESPONSE_JSON}\n```")

        self.assertEqual(parsed.message, RULES_RESPONSE["message"])

    def test_plain_code_fence(self):
        parsed = parse_scenario_rules_response(f"```\n{RULES_RESPONSE_JSON}\n```")

        self.assertEqual(parsed.message, RULES_RESPONSE["message"])

    def test_conversational_lead_in_with_no_fence(self):
        response_text = f"Sure, here's the updated rule set.\n\n{RULES_RESPONSE_JSON}"

        parsed = parse_scenario_rules_response(response_text)

        self.assertEqual(parsed.message, RULES_RESPONSE["message"])
        self.assertEqual(parsed.rules[0].name, "High incidence")

    def test_non_json_conversational_response_still_raises(self):
        with self.assertRaises(json.JSONDecodeError):
            parse_scenario_rules_response(
                "Which intervention did you mean - bednets or SMC?",
            )

    def test_missing_required_field_raises_validation_error_not_json_decode_error(self):
        # A rule missing "name" is valid JSON that fails our schema - the caller
        # (generate_scenario_rules) must be able to tell this apart from "no JSON at all".
        invalid_response = json.dumps(
            {
                "rules": [{"is_match_all": True, "matching_criteria": [], "interventions": [10]}],
                "message": "Done.",
            }
        )

        with self.assertRaises(ValidationError):
            parse_scenario_rules_response(invalid_response)

    def test_match_all_rule_parses_with_empty_criteria(self):
        response = json.dumps(
            {
                "rules": [{"name": "Everyone", "is_match_all": True, "matching_criteria": [], "interventions": [10]}],
                "message": "Created a match-all rule.",
            }
        )

        parsed = parse_scenario_rules_response(response)

        self.assertTrue(parsed.rules[0].is_match_all)
        self.assertEqual(parsed.rules[0].matching_criteria, [])

    def test_string_value_criterion_parses(self):
        response = json.dumps(
            {
                "rules": [
                    {
                        "name": "High category",
                        "is_match_all": False,
                        "matching_criteria": [{"metric_type": 1, "operator": "==", "string_value": "High"}],
                        "interventions": [10],
                    }
                ],
                "message": "Done.",
            }
        )

        parsed = parse_scenario_rules_response(response)

        self.assertEqual(parsed.rules[0].matching_criteria[0].string_value, "High")


class GenerateScenarioRulesTestCase(SimpleTestCase):
    @patch("plugins.snt_malaria.api.scenario_rule_ai.agent.call_claude")
    def test_conversational_response_is_shown_verbatim(self, mock_call_claude):
        mock_call_claude.return_value = "Which intervention did you mean - bednets or SMC?"

        result = generate_scenario_rules("add a rule", [], [], [])

        self.assertEqual(result["assistant_message"], mock_call_claude.return_value)
        self.assertIsNone(result["rules"])

    @patch("plugins.snt_malaria.api.scenario_rule_ai.agent.call_claude")
    def test_schema_invalid_response_falls_back_to_its_own_message_not_raw_json(self, mock_call_claude):
        invalid_response = {
            "rules": [{"is_match_all": True, "matching_criteria": [], "interventions": [10]}],
            "message": "Here is the rule you asked for.",
        }
        mock_call_claude.return_value = json.dumps(invalid_response)

        result = generate_scenario_rules("add a rule", [], [], [])

        self.assertEqual(result["assistant_message"], invalid_response["message"])
        self.assertIsNone(result["rules"])

    @patch("plugins.snt_malaria.api.scenario_rule_ai.agent.call_claude")
    def test_schema_invalid_response_with_no_salvageable_message_uses_generic_fallback(self, mock_call_claude):
        mock_call_claude.return_value = json.dumps(
            {"rules": [{"is_match_all": True, "matching_criteria": [], "interventions": [10]}]}
        )

        result = generate_scenario_rules("add a rule", [], [], [])

        self.assertIn("couldn't put together a valid set of rules", result["assistant_message"])
        self.assertIsNone(result["rules"])

    @patch("plugins.snt_malaria.api.scenario_rule_ai.agent.call_claude")
    def test_successful_generation_returns_flat_rule_dicts(self, mock_call_claude):
        mock_call_claude.return_value = RULES_RESPONSE_JSON

        result = generate_scenario_rules("add a rule", [], METRIC_TYPES, INTERVENTIONS)

        self.assertEqual(result["assistant_message"], RULES_RESPONSE["message"])
        self.assertEqual(result["rules"][0]["name"], "High incidence")
        self.assertEqual(result["rules"][0]["interventions"], [10])
        self.assertEqual(len(result["conversation_history"]), 2)
