import json

from django.test import SimpleTestCase

from plugins.snt_malaria.api.composite_layer_ai.agent import build_system_prompt


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
