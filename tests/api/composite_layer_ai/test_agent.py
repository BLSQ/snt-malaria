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


class BuildSystemPromptTestCase(SimpleTestCase):
    def test_catalog_placeholder_is_replaced(self):
        prompt = build_system_prompt(METRIC_TYPES)

        self.assertNotIn("{metric_types_catalog}", prompt)
        self.assertIn('- id=1, name="Rainfall", description="Yearly rainfall"', prompt)
        self.assertIn('- id=2, name="Incidence"', prompt)

    def test_empty_catalog(self):
        prompt = build_system_prompt([])

        self.assertIn("(no data layers available for this account)", prompt)

    def test_json_schema_braces_survive_substitution(self):
        # The template is applied with str.replace, so the literal braces of the JSON schema
        # example must come through unescaped and intact.
        prompt = build_system_prompt(METRIC_TYPES)

        self.assertIn('"graph": {', prompt)
        self.assertIn('"output": {"source":', prompt)

    def test_current_graph_section_appended(self):
        current_graph = {
            "nodes": [{"id": "rainfall", "type": "dataLayer", "metric_type_id": "1"}],
            "output": {"source": "rainfall", "name": "Rainfall", "legend_type": "auto"},
        }

        prompt = build_system_prompt(METRIC_TYPES, current_graph=current_graph)

        self.assertIn("## Current graph in the editor", prompt)
        self.assertIn(json.dumps(current_graph, indent=2), prompt)

    def test_no_current_graph_section_when_absent(self):
        prompt = build_system_prompt(METRIC_TYPES, current_graph=None)

        self.assertNotIn("## Current graph in the editor", prompt)


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

    def test_non_json_conversational_response_still_raises(self):
        # A genuinely conversational reply (e.g. a clarifying question, no JSON at all) must still
        # fail to parse, so the caller's fallback to "conversational" behavior keeps working.
        with self.assertRaises(json.JSONDecodeError):
            parse_composite_layer_graph_response(
                "Which data layer did you mean - rainfall or incidence?",
            )

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
    def test_conversational_response_is_shown_verbatim(self, mock_call_claude):
        mock_call_claude.return_value = "Which data layer did you mean - rainfall or incidence?"

        result = generate_composite_layer_graph("create a layer", [], [])

        self.assertEqual(result["assistant_message"], mock_call_claude.return_value)
        self.assertIsNone(result["graph"])

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

        result = generate_composite_layer_graph("create a layer", [], [])

        self.assertEqual(result["assistant_message"], invalid_response["message"])
        self.assertIsNone(result["graph"])

    @patch("plugins.snt_malaria.api.composite_layer_ai.agent.call_claude")
    def test_schema_invalid_response_with_no_salvageable_message_uses_generic_fallback(self, mock_call_claude):
        # Missing "output" entirely (as well as the invalid default) means there's no "message"
        # key to salvage either - must still degrade gracefully instead of raising or showing JSON.
        mock_call_claude.return_value = json.dumps(
            {"graph": {"nodes": [{"id": "x", "type": "classify", "input": "y", "default": 4}]}}
        )

        result = generate_composite_layer_graph("create a layer", [], [])

        self.assertIn("couldn't put together a valid graph", result["assistant_message"])
        self.assertIsNone(result["graph"])
