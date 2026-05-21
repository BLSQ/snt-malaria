from unittest.mock import Mock

from rest_framework import status

from iaso.api.common import DropdownOptionsWithRepresentationSerializer
from plugins.snt_malaria.api.intervention_cost_breakdown_line.serializers import (
    InterventionCostBreakdownLineWriteSerializer,
)
from plugins.snt_malaria.models import InterventionCostBreakdownLine, ScenarioYearlyCostAssignment
from plugins.snt_malaria.tests.api.intervention_cost_breakdown_lines.common_base import (
    InterventionCostBreakdownLineBase,
)


class InterventionCostBreakdownLineSerializerTests(InterventionCostBreakdownLineBase):
    def setUp(self):
        super().setUp()
        self.context = {"request": Mock(user=self.user_write)}

    def test_write_methods_are_not_allowed(self):
        self.client.force_authenticate(user=self.user_write)
        for method in ("post", "put", "patch", "delete"):
            response = getattr(self.client, method)(self.BASE_URL, {}, format="json")
            self.assertEqual(
                response.status_code,
                status.HTTP_405_METHOD_NOT_ALLOWED,
                f"{method.upper()} should be rejected, got {response.status_code}",
            )
        self.assertEqual(InterventionCostBreakdownLine.objects.count(), 3)

    def test_create_cost_breakdown_line_cost_below_zero(self):
        data = {
            "intervention": self.intervention_chemo_iptp.id,
            "unit_cost": -5,
            "name": "test",
            "category": "Procurement",
            "unit_type": self.unit_type_other.id,
        }
        serializer = InterventionCostBreakdownLineWriteSerializer(data=data, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("unit_cost", serializer.errors)

    def test_create_cost_breakdown_line_missing_costs_name(self):
        data = {
            "intervention": self.intervention_chemo_iptp.id,
            "unit_cost": 15,
            "category": "Procurement",
            "unit_type": self.unit_type_other.id,
        }
        serializer = InterventionCostBreakdownLineWriteSerializer(data=data, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("name", serializer.errors)

    def test_create_cost_breakdown_line_missing_costs_cost(self):
        data = {
            "intervention": self.intervention_chemo_iptp.id,
            "name": "test",
            "category": "Procurement",
            "unit_type": self.unit_type_other.id,
        }
        serializer = InterventionCostBreakdownLineWriteSerializer(data=data, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("unit_cost", serializer.errors)

    def test_create_cost_breakdown_line_missing_costs_category(self):
        data = {
            "intervention": self.intervention_chemo_iptp.id,
            "name": "test",
            "unit_cost": 15,
            "unit_type": self.unit_type_other.id,
        }
        serializer = InterventionCostBreakdownLineWriteSerializer(data=data, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("category", serializer.errors)

    def test_create_cost_breakdown_line_missing_unit_type(self):
        data = {
            "intervention": self.intervention_chemo_iptp.id,
            "name": "test",
            "unit_cost": 15,
            "category": "Procurement",
        }
        serializer = InterventionCostBreakdownLineWriteSerializer(data=data, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("unit_type", serializer.errors)

    def test_create_cost_breakdown_line_invalid_category(self):
        data = {
            "intervention": self.intervention_chemo_iptp.id,
            "name": "test",
            "unit_cost": 15,
            "category": "NotACategory",
            "unit_type": self.unit_type_other.id,
        }
        serializer = InterventionCostBreakdownLineWriteSerializer(data=data, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("category", serializer.errors)

    def test_create_cost_breakdown_lines_list_payload(self):
        data = [
            {
                "intervention": self.intervention_chemo_iptp.id,
                "name": "cost line A",
                "unit_cost": "10.00",
                "category": "Procurement",
                "unit_type": self.unit_type_other.id,
            },
            {
                "intervention": self.intervention_chemo_iptp.id,
                "name": "cost line B",
                "unit_cost": "15.50",
                "category": "Operational",
                "unit_type": self.unit_type_per_sp.id,
            },
        ]
        serializer = InterventionCostBreakdownLineWriteSerializer(data=data, many=True, context=self.context)
        self.assertTrue(serializer.is_valid(), serializer.errors)

        serializer.save()

        created_lines = InterventionCostBreakdownLine.objects.filter(
            intervention=self.intervention_chemo_iptp,
        ).order_by("name")
        self.assertEqual(created_lines.count(), 2)
        self.assertEqual(
            list(created_lines.values_list("name", flat=True)),
            ["cost line A", "cost line B"],
        )

    def test_update_cost_breakdown_lines_list_payload_updates_creates_and_deletes(self):
        existing_line_1 = self.cost_line2
        existing_line_2 = InterventionCostBreakdownLine.objects.create(
            name="Cost Line 2B",
            intervention=self.intervention_chemo_smc,
            unit_cost=7,
            unit_type=self.unit_type_other,
            category="Supportive",
            created_by=self.user_write,
        )

        queryset = InterventionCostBreakdownLine.objects.filter(intervention=self.intervention_chemo_smc).order_by("id")
        data = [
            {
                "id": existing_line_1.id,
                "intervention": self.intervention_chemo_smc.id,
                "name": "Cost Line 2 updated",
                "unit_cost": "12.00",
                "unit_type": self.unit_type_per_sp.id,
                "category": "Operational",
            },
            {
                "intervention": self.intervention_chemo_smc.id,
                "name": "Cost Line 2 new",
                "unit_cost": "9.00",
                "unit_type": self.unit_type_other.id,
                "category": "Procurement",
            },
        ]

        serializer = InterventionCostBreakdownLineWriteSerializer(
            instance=queryset,
            data=data,
            many=True,
            context=self.context,
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()

        lines = InterventionCostBreakdownLine.objects.filter(intervention=self.intervention_chemo_smc)
        self.assertEqual(lines.count(), 2)

        existing_line_1.refresh_from_db()
        self.assertEqual(existing_line_1.name, "Cost Line 2 updated")
        self.assertEqual(str(existing_line_1.unit_cost), "12.00")

        with self.assertRaises(InterventionCostBreakdownLine.DoesNotExist):
            InterventionCostBreakdownLine.objects.get(id=existing_line_2.id)

        self.assertTrue(lines.filter(name="Cost Line 2 new", unit_cost="9.00").exists())

    def test_update_cost_breakdown_line_keeps_scenario_yearly_assignment(self):
        scenario = self.create_snt_scenario(
            account=self.account,
            created_by=self.user_write,
            name="Scenario for update",
        )
        yearly_assignment = ScenarioYearlyCostAssignment.objects.create(
            scenario=scenario,
            cost_line=self.cost_line2,
            year=2026,
            value="10.00",
        )

        queryset = InterventionCostBreakdownLine.objects.filter(id=self.cost_line2.id)
        data = [
            {
                "id": self.cost_line2.id,
                "intervention": self.intervention_chemo_smc.id,
                "name": "Cost Line 2 updated",
                "unit_cost": "11.00",
                "unit_type": self.unit_type_per_sp.id,
                "category": "Operational",
            }
        ]

        serializer = InterventionCostBreakdownLineWriteSerializer(
            instance=queryset,
            data=data,
            many=True,
            context=self.context,
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()

        yearly_assignment.refresh_from_db()
        self.cost_line2.refresh_from_db()

        self.assertEqual(yearly_assignment.cost_line_id, self.cost_line2.id)
        self.assertEqual(self.cost_line2.name, "Cost Line 2 updated")
        self.assertEqual(str(self.cost_line2.unit_cost), "11.00")

    def test_remove_cost_breakdown_line_deletes_scenario_yearly_assignment(self):
        scenario = self.create_snt_scenario(
            account=self.account,
            created_by=self.user_write,
            name="Scenario for delete",
        )
        yearly_assignment = ScenarioYearlyCostAssignment.objects.create(
            scenario=scenario,
            cost_line=self.cost_line2,
            year=2026,
            value="10.00",
        )

        queryset = InterventionCostBreakdownLine.objects.filter(id=self.cost_line2.id)
        serializer = InterventionCostBreakdownLineWriteSerializer(
            instance=queryset,
            data=[],
            many=True,
            context=self.context,
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()

        with self.assertRaises(InterventionCostBreakdownLine.DoesNotExist):
            InterventionCostBreakdownLine.objects.get(id=self.cost_line2.id)

        with self.assertRaises(ScenarioYearlyCostAssignment.DoesNotExist):
            ScenarioYearlyCostAssignment.objects.get(id=yearly_assignment.id)

    def test_serializer_categories_to_representation(self):
        serializer = DropdownOptionsWithRepresentationSerializer()
        data = serializer.to_representation(("Procurement", "Procurement"))
        self.assertEqual(data, {"value": "Procurement", "label": "Procurement"})

    def test_intervention_from_other_account_is_rejected(self):
        data = {
            "intervention": self.other_intervention.id,
            "name": "x",
            "unit_cost": "1.00",
            "category": "Procurement",
            "unit_type": self.unit_type_other.id,
        }
        serializer = InterventionCostBreakdownLineWriteSerializer(data=data, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("intervention", serializer.errors)

    def test_unit_type_from_other_account_is_rejected(self):
        data = {
            "intervention": self.intervention_chemo_iptp.id,
            "name": "x",
            "unit_cost": "1.00",
            "category": "Procurement",
            "unit_type": self.other_unit_type.id,
        }
        serializer = InterventionCostBreakdownLineWriteSerializer(data=data, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("unit_type", serializer.errors)
