from unittest.mock import Mock

from iaso.api.common import DropdownOptionsWithRepresentationSerializer
from plugins.snt_malaria.api.intervention_cost_breakdown_line.serializers import (
    InterventionCostBreakdownLineSerializer,
    InterventionCostBreakdownLinesWriteSerializer,
)
from plugins.snt_malaria.tests.api.intervention_cost_breakdown_lines.common_base import (
    InterventionCostBreakdownLineBase,
)


class InterventionCostBreakdownLineSerializerTests(InterventionCostBreakdownLineBase):
    def setUp(self):
        super().setUp()
        self.context = {"request": Mock(user=self.user_write)}

    def test_create_cost_breakdown_line_missing_intervention(self):
        data = {
            "costs": [{"category": "Procurement"}],
        }
        serializer = InterventionCostBreakdownLinesWriteSerializer(data=data, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("intervention", serializer.errors)

    def test_create_cost_breakdown_line_missing_costs(self):
        data = {
            "intervention": self.intervention_chemo_iptp.id,
        }
        serializer = InterventionCostBreakdownLinesWriteSerializer(data=data, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("costs", serializer.errors)

    def test_create_cost_breakdown_line_cost_below_zero(self):
        data = {
            "intervention": self.intervention_chemo_iptp.id,
            "costs": [{"unit_cost": -5, "name": "test", "category": "Procurement"}],
        }
        serializer = InterventionCostBreakdownLineSerializer(data=data, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("unit_cost", serializer.errors)

    def test_create_cost_breakdown_line_missing_costs_name(self):
        data = {
            "intervention": self.intervention_chemo_iptp.id,
            "costs": [{"unit_cost": 15, "category": "Procurement"}],
        }
        serializer = InterventionCostBreakdownLineSerializer(data=data, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("name", serializer.errors)

    def test_create_cost_breakdown_line_missing_costs_cost(self):
        data = {
            "intervention": self.intervention_chemo_iptp.id,
            "costs": [{"name": "test", "category": "Procurement"}],
        }
        serializer = InterventionCostBreakdownLineSerializer(data=data, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("unit_cost", serializer.errors)

    def test_create_cost_breakdown_line_missing_costs_category(self):
        data = {
            "intervention": self.intervention_chemo_iptp.id,
            "costs": [{"name": "test", "unit_cost": 15}],
        }
        serializer = InterventionCostBreakdownLineSerializer(data=data, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("category", serializer.errors)

    def test_create_cost_breakdown_line_invalid_category(self):
        invalid_category_id = 9999  # Assuming this ID does not exist
        data = {
            "intervention": self.intervention_chemo_iptp.id,
            "costs": [{"name": "test", "unit_cost": 15, "category": invalid_category_id}],
        }
        serializer = InterventionCostBreakdownLineSerializer(data=data, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("category", serializer.errors)

    def test_serializer_categories_to_representation(self):
        serializer = DropdownOptionsWithRepresentationSerializer()
        data = serializer.to_representation(("Procurement", "Procurement"))
        self.assertEqual(data, {"value": "Procurement", "label": "Procurement"})
