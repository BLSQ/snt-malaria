from decimal import Decimal
from unittest.mock import Mock

from iaso.api.common import DropdownOptionsWithRepresentationSerializer
from iaso.models.metric import MetricType
from plugins.snt_malaria.api.intervention_cost_breakdown_line.serializers import (
    InterventionCostBreakdownLineSingleWriteSerializer,
    InterventionCostBreakdownLineWriteListSerializer,
    InterventionCostBreakdownLineWriteSerializer,
)
from plugins.snt_malaria.models import InterventionCostBreakdownLine, ScenarioRuleCostOverride
from plugins.snt_malaria.tests.api.intervention_cost_breakdown_lines.common_base import (
    InterventionCostBreakdownLineBase,
)


class InterventionCostBreakdownLineSerializerTests(InterventionCostBreakdownLineBase):
    def setUp(self):
        super().setUp()
        self.context = {"request": Mock(user=self.user_write)}

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

    def _new_line_data(self, **changes):
        return {
            "intervention": self.intervention_chemo_iptp.id,
            "name": "test",
            "unit_cost": 15,
            "category": "Procurement",
            "unit_type": self.unit_type_other.id,
            **changes,
        }

    def test_proportional_cost_line_coverage_above_hundred_is_rejected(self):
        data = self._new_line_data(
            is_proportional=True, population_layer=self._population_layer().id, coverage="100.01"
        )
        serializer = InterventionCostBreakdownLineWriteSerializer(data=data, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("coverage", serializer.errors)

    def test_fixed_cost_line_accepts_a_quantity_above_hundred(self):
        serializer = InterventionCostBreakdownLineWriteSerializer(
            data=self._new_line_data(coverage="250"), context=self.context
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data["coverage"], Decimal("250"))

    def test_new_cost_line_without_coverage_defaults_per_basis(self):
        """Population-based lines default to full coverage, fixed lines to a quantity of one."""
        cases = {
            "proportional": (
                self._new_line_data(is_proportional=True, population_layer=self._population_layer().id),
                Decimal("100"),
            ),
            "fixed": (self._new_line_data(), Decimal("1")),
        }
        for case, (data, expected_coverage) in cases.items():
            with self.subTest(case):
                serializer = InterventionCostBreakdownLineWriteSerializer(data=data, context=self.context)
                self.assertTrue(serializer.is_valid(), serializer.errors)
                self.assertEqual(serializer.validated_data["coverage"], expected_coverage)

    def test_basis_change_without_coverage_resets_it_to_the_new_default(self):
        self._single_update(is_proportional=True, population_layer=self._population_layer().id)

        self.cost_line2.refresh_from_db()
        self.assertEqual(self.cost_line2.coverage, Decimal("100"))

    def test_create_cost_breakdown_line_with_negative_buffer_is_rejected(self):
        data = {
            "intervention": self.intervention_chemo_iptp.id,
            "name": "test",
            "unit_cost": 15,
            "category": "Procurement",
            "unit_type": self.unit_type_other.id,
            "buffer": "-1",
        }
        serializer = InterventionCostBreakdownLineWriteSerializer(data=data, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("buffer", serializer.errors)

    def test_create_cost_breakdown_line_without_buffer_falls_back_to_budget_settings(self):
        data = {
            "intervention": self.intervention_chemo_iptp.id,
            "name": "test",
            "unit_cost": 15,
            "category": "Procurement",
            "unit_type": self.unit_type_other.id,
        }
        serializer = InterventionCostBreakdownLineWriteSerializer(data=data, context=self.context)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertIsNone(serializer.validated_data["buffer"])

    def test_update_cost_breakdown_lines_list_payload_persists_coverage(self):
        queryset = InterventionCostBreakdownLine.objects.filter(intervention=self.intervention_chemo_smc).order_by("id")
        data = [
            {
                "id": self.cost_line2.id,
                "intervention": self.intervention_chemo_smc.id,
                "name": self.cost_line2.name,
                "unit_cost": "12.00",
                "unit_type": self.unit_type_other.id,
                "category": "Operational",
                "coverage": "80.50",
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

        self.cost_line2.refresh_from_db()
        self.assertEqual(self.cost_line2.coverage, Decimal("80.50"))

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

    def _create_rule_overrides(self):
        """An all-years and a 2026 override for cost_line2 (fixed) in a rule deploying SMC."""
        scenario = self.create_snt_scenario(account=self.account, created_by=self.user_write)
        rule = self.create_snt_rule(scenario, [self.intervention_chemo_smc], created_by=self.user_write)
        all_years = self.create_snt_rule_cost_override(
            rule,
            self.cost_line2,
            unit_cost=Decimal("7"),
            buffer=Decimal("5"),
            conversion_factor=Decimal("2"),
            coverage=Decimal("50"),
        )
        yearly = self.create_snt_rule_cost_override(rule, self.cost_line2, year=2026, coverage=Decimal("100"))
        return all_years, yearly

    def _list_update(self, **changes):
        data = [
            {
                "id": self.cost_line2.id,
                "intervention": self.intervention_chemo_smc.id,
                "name": "Cost Line 2 updated",
                "unit_cost": "11.00",
                "unit_type": self.unit_type_per_sp.id,
                "category": "Operational",
                **changes,
            }
        ]
        serializer = InterventionCostBreakdownLineWriteSerializer(
            instance=InterventionCostBreakdownLine.objects.filter(id=self.cost_line2.id),
            data=data,
            many=True,
            context=self.context,
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()

    def _single_update(self, **changes):
        serializer = InterventionCostBreakdownLineSingleWriteSerializer(
            instance=self.cost_line2, data=changes, partial=True, context=self.context
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()

    def _population_layer(self):
        count = MetricType.objects.filter(account=self.account).count()
        return MetricType.objects.create(account=self.account, name=f"Under 5 {count}", code=f"U5_{count}")

    def test_list_update_without_basis_change_keeps_rule_overrides(self):
        all_years, yearly = self._create_rule_overrides()

        self._list_update()

        all_years.refresh_from_db()
        self.assertEqual(all_years.coverage, Decimal("50"))
        self.assertTrue(ScenarioRuleCostOverride.objects.filter(id=yearly.id).exists())

    def test_basis_change_resets_basis_dependent_rule_overrides(self):
        """Switching between fixed and population-based drops yearly values, coverage and factor, keeps the rest."""
        for update in (self._list_update, self._single_update):
            with self.subTest(update=update.__name__):
                self.cost_line2.is_proportional = False
                self.cost_line2.population_layer = None
                self.cost_line2.save()
                ScenarioRuleCostOverride.objects.all().delete()
                all_years, yearly = self._create_rule_overrides()

                update(is_proportional=True, population_layer=self._population_layer().id)

                all_years.refresh_from_db()
                self.assertFalse(ScenarioRuleCostOverride.objects.filter(id=yearly.id).exists())
                self.assertIsNone(all_years.coverage)
                self.assertIsNone(all_years.conversion_factor)
                self.assertEqual(all_years.unit_cost, Decimal("7"))
                self.assertEqual(all_years.buffer, Decimal("5"))

    def test_basis_change_deletes_rule_overrides_left_empty(self):
        self._create_rule_overrides()
        ScenarioRuleCostOverride.objects.filter(year__isnull=True).update(unit_cost=None, buffer=None)

        self._single_update(is_proportional=True, population_layer=self._population_layer().id)

        self.assertFalse(ScenarioRuleCostOverride.objects.exists())

    def test_intervention_change_deletes_rule_overrides(self):
        for update in (self._list_update, self._single_update):
            with self.subTest(update=update.__name__):
                self.cost_line2.intervention = self.intervention_chemo_smc
                self.cost_line2.save()
                ScenarioRuleCostOverride.objects.all().delete()
                self._create_rule_overrides()

                update(intervention=self.intervention_chemo_iptp.id)

                self.assertFalse(ScenarioRuleCostOverride.objects.filter(cost_line=self.cost_line2).exists())

    def test_remove_cost_breakdown_line_deletes_rule_overrides(self):
        self._create_rule_overrides()

        serializer = InterventionCostBreakdownLineWriteSerializer(
            instance=InterventionCostBreakdownLine.objects.filter(id=self.cost_line2.id),
            data=[],
            many=True,
            context=self.context,
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()

        self.assertFalse(ScenarioRuleCostOverride.objects.exists())

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


class InterventionCostBreakdownLineWriteSerializerTests(InterventionCostBreakdownLineBase):
    def setUp(self):
        super().setUp()
        self.context = {"request": Mock(user=self.user_write)}
        self.population_metric = MetricType.objects.create(
            account=self.account,
            name="Population total",
            code="pop_total",
        )
        self.other_population_metric = MetricType.objects.create(
            account=self.other_account,
            name="Other population",
            code="other_pop",
        )

    def test_write_serializer_filters_population_layer_queryset_with_request_account(self):
        serializer = InterventionCostBreakdownLineWriteSerializer(context=self.context)
        queryset = serializer.fields["population_layer"].queryset

        self.assertIn(self.population_metric, queryset)
        self.assertNotIn(self.other_population_metric, queryset)

    def test_write_serializer_keeps_population_layer_for_proportional_line(self):
        serializer = InterventionCostBreakdownLineWriteSerializer(
            data={
                "name": "Line 1",
                "unit_cost": 10,
                "unit_type": self.unit_type_other.id,
                "category": "Procurement",
                "intervention": self.intervention_chemo_iptp.id,
                "population_layer": self.population_metric.id,
                "is_proportional": True,
            },
            context=self.context,
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data["population_layer"], self.population_metric)

    def test_write_serializer_rejects_missing_population_layer_for_proportional_line(self):
        serializer = InterventionCostBreakdownLineWriteSerializer(
            data={
                "name": "Line 1",
                "unit_cost": 10,
                "unit_type": self.unit_type_other.id,
                "category": "Procurement",
                "intervention": self.intervention_chemo_iptp.id,
                "is_proportional": True,
            },
            context=self.context,
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("population_layer", serializer.errors)

    def test_write_serializer_rejects_inverted_zero_conversion_factor(self):
        serializer = InterventionCostBreakdownLineWriteSerializer(
            data={
                "name": "Line 1",
                "unit_cost": 10,
                "unit_type": self.unit_type_other.id,
                "category": "Procurement",
                "intervention": self.intervention_chemo_iptp.id,
                "population_layer": self.population_metric.id,
                "is_proportional": True,
                "conversion_factor": 0,
                "invert_conversion_factor": True,
            },
            context=self.context,
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("conversion_factor", serializer.errors)

    def test_write_serializer_drops_population_layer_for_fixed_line(self):
        serializer = InterventionCostBreakdownLineWriteSerializer(
            data={
                "name": "Line 1",
                "unit_cost": 10,
                "unit_type": self.unit_type_other.id,
                "category": "Procurement",
                "intervention": self.intervention_chemo_iptp.id,
                "population_layer": self.population_metric.id,
                "is_proportional": False,
            },
            context=self.context,
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertIsNone(serializer.validated_data.get("population_layer"))

    def test_list_serializer_update_applies_user_and_population_layer(self):
        list_serializer = InterventionCostBreakdownLineWriteListSerializer(
            child=InterventionCostBreakdownLineWriteSerializer(context=self.context),
            context=self.context,
        )

        list_serializer.update(
            self.intervention_chemo_iptp.cost_breakdown_lines.all(),
            [
                {
                    "name": "Population line",
                    "unit_cost": 11,
                    "unit_type": self.unit_type_other,
                    "category": "Procurement",
                    "intervention": self.intervention_chemo_iptp,
                    "population_layer": self.population_metric,
                    "is_proportional": True,
                },
                {
                    "name": "Fixed line",
                    "unit_cost": 7,
                    "unit_type": self.unit_type_per_sp,
                    "category": "Distribution",
                    "intervention": self.intervention_chemo_iptp,
                    "population_layer": None,
                },
            ],
        )

        saved_lines = list(self.intervention_chemo_iptp.cost_breakdown_lines.order_by("name"))
        self.assertEqual(len(saved_lines), 2)
        self.assertEqual(saved_lines[0].created_by, self.user_write)
        self.assertEqual(saved_lines[0].updated_by, self.user_write)
        self.assertFalse(saved_lines[0].is_proportional)
        self.assertEqual(saved_lines[1].created_by, self.user_write)
        self.assertEqual(saved_lines[1].updated_by, self.user_write)
        self.assertTrue(saved_lines[1].is_proportional)
