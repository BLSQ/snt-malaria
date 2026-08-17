import json

from unittest.mock import patch

from django.test import SimpleTestCase
from pydantic import ValidationError

from plugins.snt_malaria.api.composite_layer_ai.agent import (
    build_system_prompt,
    generate_composite_layer_graph,
    parse_composite_layer_graph_response,
)


METRIC_TYPES = [
    {"id": 1, "name": "Rainfall", "description": "Yearly rainfall"},
    {"id": 2, "name": "Incidence", "description": ""},
]

ORG_UNITS = [
    {"id": 10, "name": "North district"},
    {"id": 11, "name": "South district"},
]


class BuildSystemPromptTestCase(SimpleTestCase):
    def test_catalog_placeholder_is_replaced(self):
        prompt = build_system_prompt(METRIC_TYPES, ORG_UNITS)

        self.assertNotIn("{metric_types_catalog}", prompt)
        self.assertIn('- id=1, name="Rainfall", description="Yearly rainfall"', prompt)
        self.assertIn('- id=2, name="Incidence"', prompt)

    def test_empty_catalog(self):
        prompt = build_system_prompt([], ORG_UNITS)

        self.assertIn("(no data layers available for this account)", prompt)

    def test_org_units_catalog_placeholder_is_replaced(self):
        prompt = build_system_prompt(METRIC_TYPES, ORG_UNITS)

        self.assertNotIn("{org_units_catalog}", prompt)
        self.assertIn('- id=10, name="North district"', prompt)
        self.assertIn('- id=11, name="South district"', prompt)

    def test_empty_org_units_catalog(self):
        prompt = build_system_prompt(METRIC_TYPES, [])

        self.assertIn("(no districts available for this account)", prompt)

    def test_json_schema_braces_survive_substitution(self):
        # The template is applied with str.replace, so the literal braces of the JSON schema
        # example must come through unescaped and intact.
        prompt = build_system_prompt(METRIC_TYPES, ORG_UNITS)

        self.assertIn('"graph": {', prompt)
        self.assertIn('"output": {"source":', prompt)

    def test_current_graph_section_appended(self):
        current_graph = {
            "nodes": [{"id": "rainfall", "type": "dataLayer", "metric_type_id": "1"}],
            "output": {"source": "rainfall", "name": "Rainfall", "legend_type": "auto"},
        }

        prompt = build_system_prompt(METRIC_TYPES, ORG_UNITS, current_graph=current_graph)

        self.assertIn("## Current graph in the editor", prompt)
        self.assertIn(json.dumps(current_graph, indent=2), prompt)

    def test_no_current_graph_section_when_absent(self):
        prompt = build_system_prompt(METRIC_TYPES, ORG_UNITS, current_graph=None)

        self.assertNotIn("## Current graph in the editor", prompt)

    def test_normalize_type_documented_in_prompt(self):
        prompt = build_system_prompt(METRIC_TYPES, ORG_UNITS)

        self.assertIn("normalize_type", prompt)
        self.assertIn("min-max", prompt)
        self.assertIn("percentile", prompt)

    def test_selected_year_documented_in_prompt(self):
        prompt = build_system_prompt(METRIC_TYPES, ORG_UNITS)

        self.assertIn("selected_year", prompt)
        self.assertIn("## Working with years", prompt)

    def test_multi_year_comparison_via_repeated_data_layer_documented_in_prompt(self):
        # The AI must know it can add the same metric type as two separate dataLayer nodes, each
        # pinned to a different year, to compare specific years of one layer against each other.
        prompt = build_system_prompt(METRIC_TYPES, ORG_UNITS)

        self.assertIn("multiple separate `dataLayer` nodes", prompt)
        self.assertIn("2023 rainfall ÷ 2022 rainfall", prompt)

    def test_years_included_in_catalog_when_present(self):
        metric_types_with_years = [
            {"id": 1, "name": "Rainfall", "description": "", "years": [2024, 2023, 2022]},
        ]

        prompt = build_system_prompt(metric_types_with_years, ORG_UNITS)

        self.assertIn("years=[2024, 2023, 2022]", prompt)

    def test_years_omitted_from_catalog_when_absent(self):
        # METRIC_TYPES has no "years" key at all (a non-yearly layer) - nothing should be appended.
        prompt = build_system_prompt(METRIC_TYPES, ORG_UNITS)

        self.assertNotIn("years=", prompt)

    def test_filter_node_documented_in_prompt(self):
        prompt = build_system_prompt(METRIC_TYPES, ORG_UNITS)

        self.assertIn("`filter`", prompt)
        self.assertIn("org_units", prompt)
        self.assertIn('"mode"', prompt)
        self.assertIn('"ids"', prompt)

    def test_stack_operation_documented_in_prompt(self):
        prompt = build_system_prompt(METRIC_TYPES, ORG_UNITS)

        self.assertIn("stack", prompt)
        self.assertIn("ORDER-DEPENDENT", prompt)
        self.assertIn("ASCENDING priority", prompt)

    def test_never_invent_org_unit_ids_documented_in_prompt(self):
        prompt = build_system_prompt(METRIC_TYPES, ORG_UNITS)

        self.assertIn("never invent an id", prompt)

    def test_filter_mode_choice_heuristic_documented_in_prompt(self):
        prompt = build_system_prompt(METRIC_TYPES, ORG_UNITS)

        self.assertIn("keeps `ids` shortest", prompt)
        self.assertIn("explicitly says", prompt)
        self.assertIn("always wins over the shortest-list heuristic", prompt)

    def test_quick_replies_documented_in_prompt(self):
        prompt = build_system_prompt(METRIC_TYPES, ORG_UNITS)

        self.assertIn("quick_replies", prompt)
        self.assertIn("Never prefix a `question` or an `option` with a", prompt)
        self.assertIn("clean label text only", prompt)


GRAPH_RESPONSE = {
    "graph": {
        "nodes": [{"id": "rainfall", "type": "dataLayer", "metric_type_id": "1"}],
        "output": {"source": "rainfall", "name": "Rainfall", "legend_type": "auto"},
    },
    "message": "Created a layer from the rainfall data.",
}
GRAPH_RESPONSE_JSON = json.dumps(GRAPH_RESPONSE)


class ParseCompositeLayerGraphResponseTestCase(SimpleTestCase):
    def test_plain_json_with_no_fence(self):
        parsed = parse_composite_layer_graph_response(GRAPH_RESPONSE_JSON)

        self.assertEqual(parsed.message, GRAPH_RESPONSE["message"])
        self.assertEqual(parsed.graph.nodes[0].id, "rainfall")

    def test_json_code_fence(self):
        parsed = parse_composite_layer_graph_response(f"```json\n{GRAPH_RESPONSE_JSON}\n```")

        self.assertEqual(parsed.message, GRAPH_RESPONSE["message"])

    def test_plain_code_fence(self):
        parsed = parse_composite_layer_graph_response(f"```\n{GRAPH_RESPONSE_JSON}\n```")

        self.assertEqual(parsed.message, GRAPH_RESPONSE["message"])

    def test_conversational_lead_in_with_no_fence(self):
        # The model is told not to add text outside the JSON, but sometimes does anyway (e.g.
        # "You're right - that's a needless round-trip." before the graph), with no code fence to
        # strip - regression test for the resulting raw-JSON-dumped-into-chat bug.
        response_text = f"You're right, let's simplify that.\n\n{GRAPH_RESPONSE_JSON}"

        parsed = parse_composite_layer_graph_response(response_text)

        self.assertEqual(parsed.message, GRAPH_RESPONSE["message"])
        self.assertEqual(parsed.graph.nodes[0].id, "rainfall")

    def test_conversational_remark_after_with_no_fence(self):
        # The model is told not to add text outside the JSON, but sometimes appends a trailing
        # remark anyway, with no code fence to strip - regression test for the resulting
        # "Extra data" JSONDecodeError that (before this fix) dumped the raw JSON into the chat.
        response_text = f"{GRAPH_RESPONSE_JSON}\n\nLet me know if you'd like any changes."

        parsed = parse_composite_layer_graph_response(response_text)

        self.assertEqual(parsed.message, GRAPH_RESPONSE["message"])
        self.assertEqual(parsed.graph.nodes[0].id, "rainfall")

    def test_non_json_conversational_response_still_raises(self):
        # A genuinely conversational reply (e.g. a clarifying question, no JSON at all) must still
        # fail to parse, so the caller's fallback to "conversational" behavior keeps working.
        with self.assertRaises(json.JSONDecodeError):
            parse_composite_layer_graph_response(
                "Which data layer did you mean - rainfall or incidence?",
            )

    def test_chat_only_response_with_quick_replies_parses(self):
        # The primary shape for a clarifying question: valid JSON, graph is null, quick_replies
        # carries the selectable questions.
        response = json.dumps(
            {
                "message": "A couple of things to pin down first:",
                "graph": None,
                "quick_replies": [
                    {"question": "Which incidence source?", "options": ["SNIS adjusted", "SNIS crude"]},
                ],
            }
        )

        parsed = parse_composite_layer_graph_response(response)

        self.assertIsNone(parsed.graph)
        self.assertEqual(parsed.quick_replies[0].question, "Which incidence source?")
        self.assertEqual(parsed.quick_replies[0].options, ["SNIS adjusted", "SNIS crude"])

    def test_quick_replies_omitted_parses_as_none(self):
        parsed = parse_composite_layer_graph_response(GRAPH_RESPONSE_JSON)

        self.assertIsNone(parsed.quick_replies)

    def test_quick_reply_question_with_fewer_than_two_options_raises(self):
        response = json.dumps(
            {
                "message": "Which one?",
                "graph": None,
                "quick_replies": [{"question": "Which one?", "options": ["Only one"]}],
            }
        )

        with self.assertRaises(ValidationError):
            parse_composite_layer_graph_response(response)

    def test_quick_reply_options_as_bare_string_raises(self):
        response = json.dumps(
            {
                "message": "Which one?",
                "graph": None,
                "quick_replies": [{"question": "Which one?", "options": "Rainfall"}],
            }
        )

        with self.assertRaises(ValidationError):
            parse_composite_layer_graph_response(response)

    def test_more_than_five_quick_reply_questions_raises(self):
        response = json.dumps(
            {
                "message": "Lots to clarify:",
                "graph": None,
                "quick_replies": [{"question": f"Question {i}", "options": ["A", "B"]} for i in range(6)],
            }
        )

        with self.assertRaises(ValidationError):
            parse_composite_layer_graph_response(response)

    def test_data_layer_node_with_selected_year_parses(self):
        response = json.dumps(
            {
                "graph": {
                    "nodes": [
                        {"id": "rainfall", "type": "dataLayer", "metric_type_id": "1", "selected_year": "2023"},
                    ],
                    "output": {"source": "rainfall", "name": "Rainfall 2023", "legend_type": "auto"},
                },
                "message": "Pinned the rainfall layer to 2023.",
            }
        )

        parsed = parse_composite_layer_graph_response(response)

        self.assertEqual(parsed.graph.nodes[0].selected_year, "2023")

    def test_data_layer_node_without_selected_year_parses_as_none(self):
        # selected_year is optional; the backend evaluator treats a missing value as "all years".
        parsed = parse_composite_layer_graph_response(GRAPH_RESPONSE_JSON)

        self.assertIsNone(parsed.graph.nodes[0].selected_year)

    def test_normalize_node_with_percentile_type_parses(self):
        response = json.dumps(
            {
                "graph": {
                    "nodes": [
                        {"id": "rainfall", "type": "dataLayer", "metric_type_id": "1"},
                        {
                            "id": "norm",
                            "type": "normalize",
                            "input": "rainfall",
                            "scale": 1,
                            "normalize_type": "percentile",
                        },
                    ],
                    "output": {"source": "norm", "name": "Rainfall percentile", "legend_type": "auto"},
                },
                "message": "Created a percentile-normalized layer from the rainfall data.",
            }
        )

        parsed = parse_composite_layer_graph_response(response)

        self.assertEqual(parsed.graph.nodes[1].normalize_type, "percentile")

    def test_normalize_node_without_type_parses_with_none(self):
        # normalize_type is optional; the backend evaluator defaults a missing value to "min-max".
        response = json.dumps(
            {
                "graph": {
                    "nodes": [
                        {"id": "rainfall", "type": "dataLayer", "metric_type_id": "1"},
                        {"id": "norm", "type": "normalize", "input": "rainfall", "scale": 1},
                    ],
                    "output": {"source": "norm", "name": "Rainfall normalized", "legend_type": "auto"},
                },
                "message": "Created.",
            }
        )

        parsed = parse_composite_layer_graph_response(response)

        self.assertIsNone(parsed.graph.nodes[1].normalize_type)

    def test_filter_node_parses(self):
        response = json.dumps(
            {
                "graph": {
                    "nodes": [
                        {"id": "rainfall", "type": "dataLayer", "metric_type_id": "1"},
                        {
                            "id": "north_only",
                            "type": "filter",
                            "input": "rainfall",
                            "org_units": {"mode": "none", "ids": [10, 11]},
                        },
                    ],
                    "output": {"source": "north_only", "name": "Northern rainfall", "legend_type": "auto"},
                },
                "message": "Filtered to the northern districts.",
            }
        )

        parsed = parse_composite_layer_graph_response(response)

        filter_node = parsed.graph.nodes[1]
        self.assertEqual(filter_node.input, "rainfall")
        self.assertEqual(filter_node.org_units.mode, "none")
        self.assertEqual(filter_node.org_units.ids, [10, 11])

    def test_filter_node_org_units_without_mode_defaults_to_all(self):
        response = json.dumps(
            {
                "graph": {
                    "nodes": [
                        {"id": "rainfall", "type": "dataLayer", "metric_type_id": "1"},
                        {
                            "id": "f",
                            "type": "filter",
                            "input": "rainfall",
                            "org_units": {"ids": [10, 11]},
                        },
                    ],
                    "output": {"source": "f", "name": "Filtered rainfall", "legend_type": "auto"},
                },
                "message": "Created.",
            }
        )

        parsed = parse_composite_layer_graph_response(response)

        self.assertEqual(parsed.graph.nodes[1].org_units.mode, "all")

    def test_filter_node_without_org_units_parses_as_none(self):
        response = json.dumps(
            {
                "graph": {
                    "nodes": [
                        {"id": "rainfall", "type": "dataLayer", "metric_type_id": "1"},
                        {"id": "f", "type": "filter", "input": "rainfall"},
                    ],
                    "output": {"source": "f", "name": "Filtered rainfall", "legend_type": "auto"},
                },
                "message": "Created.",
            }
        )

        parsed = parse_composite_layer_graph_response(response)

        self.assertIsNone(parsed.graph.nodes[1].org_units)

    def test_combine_stack_operation_parses(self):
        response = json.dumps(
            {
                "graph": {
                    "nodes": [
                        {"id": "rainfall", "type": "dataLayer", "metric_type_id": "1"},
                        {"id": "incidence", "type": "dataLayer", "metric_type_id": "2"},
                        {
                            "id": "merged",
                            "type": "combine",
                            "inputs": ["rainfall", "incidence"],
                            "operation": "stack",
                        },
                    ],
                    "output": {"source": "merged", "name": "Merged layer", "legend_type": "auto"},
                },
                "message": "Stacked the two layers.",
            }
        )

        parsed = parse_composite_layer_graph_response(response)

        self.assertEqual(parsed.graph.nodes[2].operation, "stack")
        self.assertEqual(parsed.graph.nodes[2].inputs, ["rainfall", "incidence"])

    def test_schema_invalid_json_raises_validation_error_not_json_decode_error(self):
        # Regression test: a `classify` node with a numeric `default` (the model tried to make
        # classify emit numbers instead of text labels) is valid JSON that fails our schema - the
        # caller (generate_composite_layer_graph) must be able to tell this apart from "no JSON at
        # all" to avoid dumping the raw JSON into the chat as if it were a conversational reply.
        invalid_response = json.dumps(
            {
                "graph": {
                    "nodes": [{"id": "x", "type": "classify", "input": "y", "default": 4}],
                    "output": {"source": "x", "name": "test", "legend_type": "auto"},
                },
                "message": "Done.",
            }
        )

        with self.assertRaises(ValidationError):
            parse_composite_layer_graph_response(invalid_response)


class GenerateCompositeLayerGraphTestCase(SimpleTestCase):
    @patch("plugins.snt_malaria.api.composite_layer_ai.agent.call_claude")
    def test_non_json_response_falls_back_to_verbatim_text(self, mock_call_claude):
        # Anomaly fallback: the model returned no JSON at all despite the always-JSON instruction.
        # Must still degrade gracefully rather than raising or dropping the reply.
        mock_call_claude.return_value = "Which data layer did you mean - rainfall or incidence?"

        result = generate_composite_layer_graph("create a layer", [], [], [])

        self.assertEqual(result["assistant_message"], mock_call_claude.return_value)
        self.assertIsNone(result["graph"])
        self.assertIsNone(result["quick_replies"])

    @patch("plugins.snt_malaria.api.composite_layer_ai.agent.call_claude")
    def test_graph_response_returns_graph_and_message(self, mock_call_claude):
        mock_call_claude.return_value = GRAPH_RESPONSE_JSON

        result = generate_composite_layer_graph("create a layer", [], [], [])

        self.assertEqual(result["assistant_message"], GRAPH_RESPONSE["message"])
        self.assertEqual(result["graph"]["nodes"][0]["id"], "rainfall")
        self.assertIsNone(result["quick_replies"])

    @patch("plugins.snt_malaria.api.composite_layer_ai.agent.call_claude")
    def test_clarifying_question_with_quick_replies_returned(self, mock_call_claude):
        mock_call_claude.return_value = json.dumps(
            {
                "message": "A couple of things to pin down first:",
                "graph": None,
                "quick_replies": [
                    {"question": "Which incidence source?", "options": ["SNIS adjusted", "SNIS crude"]},
                ],
            }
        )

        result = generate_composite_layer_graph("build a risk layer", [], [], [])

        self.assertEqual(result["assistant_message"], "A couple of things to pin down first:")
        self.assertIsNone(result["graph"])
        self.assertEqual(result["quick_replies"][0]["question"], "Which incidence source?")
        self.assertEqual(result["quick_replies"][0]["options"], ["SNIS adjusted", "SNIS crude"])

    @patch("plugins.snt_malaria.api.composite_layer_ai.agent.call_claude")
    def test_schema_invalid_response_falls_back_to_its_own_message_not_raw_json(self, mock_call_claude):
        invalid_response = {
            "graph": {
                "nodes": [{"id": "x", "type": "classify", "input": "y", "default": 4}],
                "output": {"source": "x", "name": "test", "legend_type": "auto"},
            },
            "message": "Here is the numeric classification you asked for.",
        }
        mock_call_claude.return_value = json.dumps(invalid_response)

        result = generate_composite_layer_graph("create a layer", [], [], [])

        self.assertEqual(result["assistant_message"], invalid_response["message"])
        self.assertIsNone(result["graph"])
        self.assertIsNone(result["quick_replies"])

    @patch("plugins.snt_malaria.api.composite_layer_ai.agent.call_claude")
    def test_schema_invalid_response_with_no_salvageable_message_uses_generic_fallback(self, mock_call_claude):
        # Missing "output" entirely (as well as the invalid default) means there's no "message"
        # key to salvage either - must still degrade gracefully instead of raising or showing JSON.
        mock_call_claude.return_value = json.dumps(
            {"graph": {"nodes": [{"id": "x", "type": "classify", "input": "y", "default": 4}]}}
        )

        result = generate_composite_layer_graph("create a layer", [], [], [])

        self.assertIn("couldn't put together a valid graph", result["assistant_message"])
        self.assertIsNone(result["graph"])
        self.assertIsNone(result["quick_replies"])

    @patch("plugins.snt_malaria.api.composite_layer_ai.agent.call_claude")
    def test_malformed_json_graph_attempt_uses_generic_fallback_not_raw_text(self, mock_call_claude):
        # Starts with "{" (an attempted graph, per the prompt's own contract) but a dropped quote
        # makes it invalid JSON - must degrade the same as a schema-invalid response, never dump
        # this broken text to the user as if it were a conversational reply.
        mock_call_claude.return_value = (
            '{"graph": {"nodes": [], "output": {source": "x", "name": "test", "legend_type": "auto"}}, '
            '"message": "Here you go."}'
        )

        result = generate_composite_layer_graph("create a layer", [], [], [])

        self.assertIn("couldn't put together a valid graph", result["assistant_message"])
        self.assertNotIn("nodes", result["assistant_message"])
        self.assertIsNone(result["graph"])
        self.assertIsNone(result["quick_replies"])

    @patch("plugins.snt_malaria.api.composite_layer_ai.agent.call_claude")
    def test_validation_error_salvages_quick_replies_alongside_message(self, mock_call_claude):
        # A malformed "graph" sub-object shouldn't cost a good clarifying question its options.
        mock_call_claude.return_value = json.dumps(
            {
                "message": "Which one did you mean?",
                "graph": {"nodes": [{"id": "x", "type": "classify", "input": "y", "default": 4}]},
                "quick_replies": [{"question": "Which one?", "options": ["Rainfall", "Incidence"]}],
            }
        )

        result = generate_composite_layer_graph("create a layer", [], [], [])

        self.assertEqual(result["assistant_message"], "Which one did you mean?")
        self.assertIsNone(result["graph"])
        self.assertEqual(result["quick_replies"], [{"question": "Which one?", "options": ["Rainfall", "Incidence"]}])
