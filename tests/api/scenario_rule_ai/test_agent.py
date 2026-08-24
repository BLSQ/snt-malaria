import json

from unittest.mock import patch

from django.test import SimpleTestCase
from pydantic import ValidationError

from plugins.snt_malaria.api.scenario_rule_ai.agent import (
    build_static_system_prompt,
    build_system_blocks,
    call_claude,
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
        prompt = build_static_system_prompt(METRIC_TYPES, INTERVENTIONS)

        self.assertNotIn("{metric_types_catalog}", prompt)
        self.assertNotIn("{interventions_catalog}", prompt)
        self.assertIn('- id=1, name="Incidence", description="Malaria incidence"', prompt)
        self.assertIn('- id=2, name="Rainfall"', prompt)
        self.assertIn("Vector control:", prompt)
        self.assertIn('- id=10, name="Bednets"', prompt)

    def test_colors_catalog_is_included_and_required(self):
        # The palette is global (not account-specific), so it's always present regardless of args.
        prompt = build_static_system_prompt(METRIC_TYPES, INTERVENTIONS)

        self.assertNotIn("{colors_catalog}", prompt)
        self.assertIn('value="#b71c1c", name="Red 900"', prompt)
        self.assertIn("Always set a `color` for every rule - it is required, not optional", prompt)
        self.assertIn("never reuse", prompt)

    def test_empty_catalogs(self):
        prompt = build_static_system_prompt([], [])

        self.assertIn("(no data layers available for this account)", prompt)
        self.assertIn("(no interventions available for this account)", prompt)

    def test_priority_merge_vs_conflict_semantics_are_explained(self):
        # Matches Scenario.refresh_assignments/ScenarioRule.refresh_assignments (models/scenario.py):
        # different categories always merge; same category is won by the highest-priority rule; two
        # interventions of the same category within one rule leave only the first actually assigned.
        prompt = build_static_system_prompt(METRIC_TYPES, INTERVENTIONS)

        self.assertIn("last rule in the list has the highest priority", prompt)
        self.assertIn("DIFFERENT intervention categories are always merged", prompt)
        self.assertIn("SAME intervention category conflict", prompt)
        self.assertIn("only the highest-priority rule's", prompt)
        self.assertIn("Never assign two interventions from the same category within a single rule", prompt)

    def test_message_field_instructs_names_not_ids(self):
        # Regression: the model was writing ids in parentheses to disambiguate two catalog entries
        # with the same name (e.g. "'TEST' (id 97)") - the instruction must explicitly forbid that,
        # not just say "use names," and give it another way to disambiguate.
        prompt = build_static_system_prompt(METRIC_TYPES, INTERVENTIONS)

        self.assertIn("never write a numeric id", prompt)
        self.assertIn("not even in parentheses", prompt)
        self.assertIn("share the exact same name", prompt)

    def test_rule_name_instructed_to_describe_action_not_criteria(self):
        # Regression: the model was naming rules after their matching_criteria (e.g. "High risk
        # areas" for a "Risk stratification == Elevée" rule), which just repeats what the UI already
        # shows next to the name - the name should instead say what the rule does.
        prompt = build_static_system_prompt(METRIC_TYPES, INTERVENTIONS)

        self.assertIn("describe what the rule DOES", prompt)
        self.assertIn("not restate its `matching_criteria`", prompt)

    def test_rules_must_have_at_least_one_intervention(self):
        # Regression: the model suggested a match-all "baseline" rule with no interventions - a
        # no-op, since a rule with nothing to assign does nothing regardless of what it matches.
        prompt = build_static_system_prompt(METRIC_TYPES, INTERVENTIONS)

        self.assertIn("Every rule MUST assign at least one intervention", prompt)
        self.assertIn("`interventions` may never be empty, for\n  match-all rules included", prompt)

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

        prompt = build_static_system_prompt(metric_types, [])

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

        prompt = build_static_system_prompt(metric_types, [])

        self.assertIn("typical value range: 0 to 500", prompt)

    def test_metric_type_without_legend_config_has_no_range_or_categories(self):
        prompt = build_static_system_prompt(METRIC_TYPES, [])

        self.assertNotIn("typical value range", prompt)
        self.assertNotIn("categorical - valid values", prompt)

    def test_json_schema_braces_survive_substitution(self):
        prompt = build_static_system_prompt(METRIC_TYPES, INTERVENTIONS)

        self.assertIn('"rules": [', prompt)
        self.assertIn('"message": "<your explanation', prompt)


class BuildSystemBlocksTestCase(SimpleTestCase):
    def test_static_block_is_cached(self):
        blocks = build_system_blocks(METRIC_TYPES, INTERVENTIONS)

        self.assertEqual(len(blocks), 1)
        self.assertEqual(blocks[0]["cache_control"], {"type": "ephemeral", "ttl": "1h"})
        self.assertEqual(blocks[0]["text"], build_static_system_prompt(METRIC_TYPES, INTERVENTIONS))

    def test_current_rules_appended_as_separate_uncached_block(self):
        # Kept out of the cached block since it changes on every turn - bundling it in would
        # invalidate the cache each time the user edits the rule set.
        current_rules = [
            {"id": 1, "name": "High incidence", "is_match_all": False, "matching_criteria": [], "interventions": [10]}
        ]

        blocks = build_system_blocks(METRIC_TYPES, INTERVENTIONS, current_rules=current_rules)

        self.assertEqual(len(blocks), 2)
        self.assertNotIn("cache_control", blocks[1])
        self.assertIn("## Current rules for this scenario", blocks[1]["text"])
        self.assertIn(json.dumps(current_rules, indent=2), blocks[1]["text"])

    def test_no_second_block_when_current_rules_absent(self):
        blocks = build_system_blocks(METRIC_TYPES, INTERVENTIONS, current_rules=None)

        self.assertEqual(len(blocks), 1)


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


class QuickRepliesTestCase(SimpleTestCase):
    def test_clarifying_turn_parses_with_null_rules_and_quick_replies(self):
        response = json.dumps(
            {
                "message": "Which intervention should this rule assign?",
                "rules": None,
                "quick_replies": [{"question": "Intervention", "options": ["Bednets", "SMC"]}],
            }
        )

        parsed = parse_scenario_rules_response(response)

        self.assertIsNone(parsed.rules)
        self.assertEqual(parsed.quick_replies[0].question, "Intervention")
        self.assertEqual(parsed.quick_replies[0].options, ["Bednets", "SMC"])

    def test_single_option_question_is_rejected(self):
        # A pick-one question with nothing to pick between is a prompt-following failure, not a
        # usable question - the UI would render a radio group with one choice.
        response = json.dumps(
            {"message": "Pick one", "rules": None, "quick_replies": [{"question": "Layer", "options": ["Incidence"]}]}
        )

        with self.assertRaises(ValidationError):
            parse_scenario_rules_response(response)

    @patch("plugins.snt_malaria.api.scenario_rule_ai.agent.call_claude")
    def test_quick_replies_are_returned_on_a_clarifying_turn(self, mock_call_claude):
        mock_call_claude.return_value = json.dumps(
            {
                "message": "Which layer?",
                "rules": None,
                "quick_replies": [{"question": "Layer", "options": ["Incidence", "Rainfall"]}],
            }
        )

        result = generate_scenario_rules("add a rule", [], METRIC_TYPES, INTERVENTIONS)

        self.assertIsNone(result["rules"])
        self.assertEqual(result["assistant_message"], "Which layer?")
        self.assertEqual(result["quick_replies"], [{"question": "Layer", "options": ["Incidence", "Rainfall"]}])

    @patch("plugins.snt_malaria.api.scenario_rule_ai.agent.call_claude")
    def test_valid_quick_replies_survive_a_schema_invalid_rule_set(self, mock_call_claude):
        # The ValidationError came from `rules`, so the questions themselves are still usable and
        # are the only actionable thing left in the turn.
        mock_call_claude.return_value = json.dumps(
            {
                "message": "Almost - one thing first.",
                "rules": [{"is_match_all": True, "interventions": [10]}],
                "quick_replies": [{"question": "Layer", "options": ["Incidence", "Rainfall"]}],
            }
        )

        result = generate_scenario_rules("add a rule", [], METRIC_TYPES, INTERVENTIONS)

        self.assertIsNone(result["rules"])
        self.assertEqual(result["assistant_message"], "Almost - one thing first.")
        self.assertEqual(result["quick_replies"], [{"question": "Layer", "options": ["Incidence", "Rainfall"]}])

    @patch("plugins.snt_malaria.api.scenario_rule_ai.agent.call_claude")
    def test_invalid_quick_replies_are_dropped_rather_than_failing_the_turn(self, mock_call_claude):
        mock_call_claude.return_value = json.dumps(
            {
                "message": "Here you go.",
                "rules": [{"is_match_all": True, "interventions": [10]}],
                "quick_replies": [{"question": "Layer", "options": ["Only one"]}],
            }
        )

        result = generate_scenario_rules("add a rule", [], METRIC_TYPES, INTERVENTIONS)

        self.assertIsNone(result["quick_replies"])
        self.assertEqual(result["assistant_message"], "Here you go.")

    @patch("plugins.snt_malaria.api.scenario_rule_ai.agent.call_claude")
    def test_botched_json_object_is_not_shown_raw_to_the_user(self, mock_call_claude):
        mock_call_claude.return_value = '{"message": "Here you go", "rules": [{'

        result = generate_scenario_rules("add a rule", [], METRIC_TYPES, INTERVENTIONS)

        self.assertIn("couldn't put together a valid set of rules", result["assistant_message"])
        self.assertNotIn("{", result["assistant_message"])
        self.assertIsNone(result["rules"])


class AttachmentsTestCase(SimpleTestCase):
    @patch("plugins.snt_malaria.api.scenario_rule_ai.agent.call_claude")
    def test_attachments_are_forwarded_to_call_claude_and_carried_into_history(self, mock_call_claude):
        mock_call_claude.return_value = "Which rules should I base on this document?"
        attachments = [{"file_id": "file_abc123", "filename": "strategy.pdf"}]

        result = generate_scenario_rules("use this", [], METRIC_TYPES, INTERVENTIONS, attachments=attachments)

        self.assertEqual(mock_call_claude.call_args.kwargs["attachments"], attachments)
        self.assertEqual(result["conversation_history"][0]["attachments"], attachments)

    @patch("plugins.snt_malaria.api.scenario_rule_ai.agent.anthropic.Anthropic")
    def test_call_claude_sends_document_blocks_with_the_files_beta(self, mock_anthropic_cls):
        mock_client = mock_anthropic_cls.return_value
        mock_client.beta.messages.create.return_value.content = [type("Block", (), {"text": "ok"})()]

        call_claude(
            "use this",
            [],
            METRIC_TYPES,
            INTERVENTIONS,
            attachments=[{"file_id": "file_abc123", "filename": "strategy.pdf"}],
        )

        kwargs = mock_client.beta.messages.create.call_args.kwargs
        self.assertEqual(kwargs["betas"], ["files-api-2025-04-14"])
        first_block = kwargs["messages"][0]["content"][0]
        self.assertEqual(first_block["type"], "document")
        self.assertEqual(first_block["source"]["file_id"], "file_abc123")
