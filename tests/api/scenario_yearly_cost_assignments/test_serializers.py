from unittest.mock import Mock

from plugins.snt_malaria.api.scenario_yearly_cost_assignment.serializers import (
    ScenarioYearlyCostAssignmentSerializer,
    ScenarioYearlyCostAssignmentUpsertSerializer,
)
from plugins.snt_malaria.models import InterventionCostBreakdownLine, ScenarioYearlyCostAssignment
from plugins.snt_malaria.models.cost_unit_type import CostUnitType
from plugins.snt_malaria.permissions import SNT_SCENARIO_BASIC_WRITE_PERMISSION, SNT_SCENARIO_FULL_WRITE_PERMISSION
from plugins.snt_malaria.tests.common_base import SNTMalariaTestCase


class ScenarioYearlyCostAssignmentSerializerBaseTestCase(SNTMalariaTestCase):
    def setUp(self):
        super().setUp()

        self.full_perm_user = self.create_user_with_profile(
            username="fullperm", account=self.account, permissions=[SNT_SCENARIO_FULL_WRITE_PERMISSION]
        )
        self.basic_perm_user = self.create_user_with_profile(
            username="basicperm", account=self.account, permissions=[SNT_SCENARIO_BASIC_WRITE_PERMISSION]
        )
        self.other_user = self.create_user_with_profile(username="otheruser", account=self.account)

        self.scenario = self.create_snt_scenario(account=self.account, created_by=self.user, name="Scenario A")
        self.other_user_scenario = self.create_snt_scenario(
            account=self.account,
            created_by=self.other_user,
            name="Scenario B",
        )
        self.locked_scenario = self.create_snt_scenario(
            account=self.account,
            created_by=self.user,
            name="Locked Scenario",
            is_locked=True,
        )

        self.other_account, self.other_account_user = self.create_snt_account(
            name="Other Account",
            username="external",
        )
        self.other_account_scenario = self.create_snt_scenario(
            account=self.other_account,
            created_by=self.other_account_user,
            name="Other Account Scenario",
        )

        self.category = self.create_snt_intervention_category(name="Vaccination")
        self.intervention = self.create_snt_intervention(
            name="RTS,S",
            intervention_category=self.category,
            code="rts_s",
        )
        self.unit_type = CostUnitType.objects.create(account=self.account, name="Other")

        self.population_line_1 = InterventionCostBreakdownLine.objects.create(
            intervention=self.intervention,
            unit_type=self.unit_type,
            name="Population line 1",
            category="Procurement",
            cost_driver=InterventionCostBreakdownLine.CostDriver.POPULATION,
            unit_cost=10,
            created_by=self.user,
        )
        self.population_line_2 = InterventionCostBreakdownLine.objects.create(
            intervention=self.intervention,
            unit_type=self.unit_type,
            name="Population line 2",
            category="Operational",
            cost_driver=InterventionCostBreakdownLine.CostDriver.POPULATION,
            unit_cost=15,
            created_by=self.user,
        )
        self.fixed_cost_line = InterventionCostBreakdownLine.objects.create(
            intervention=self.intervention,
            unit_type=self.unit_type,
            name="Fixed line",
            category="Supportive",
            cost_driver=InterventionCostBreakdownLine.CostDriver.FIXED_COST,
            unit_cost=20,
            created_by=self.user,
        )

        self.other_account_category = self.create_snt_intervention_category(
            name="Other Category",
            account=self.other_account,
            created_by=self.other_account_user,
        )
        self.other_account_intervention = self.create_snt_intervention(
            name="Other Intervention",
            created_by=self.other_account_user,
            intervention_category=self.other_account_category,
            code="other_int",
        )
        self.other_account_unit_type = CostUnitType.objects.create(account=self.other_account, name="Other")
        self.other_account_cost_line = InterventionCostBreakdownLine.objects.create(
            intervention=self.other_account_intervention,
            unit_type=self.other_account_unit_type,
            name="Other cost line",
            category="Procurement",
            cost_driver=InterventionCostBreakdownLine.CostDriver.POPULATION,
            unit_cost=30,
            created_by=self.other_account_user,
        )

    def _context_for(self, user):
        return {"request": Mock(user=user)}


class ScenarioYearlyCostAssignmentSerializerTests(ScenarioYearlyCostAssignmentSerializerBaseTestCase):
    def test_to_representation_multiplies_value_by_100_for_population_lines(self):
        assignment = ScenarioYearlyCostAssignment.objects.create(
            scenario=self.scenario,
            cost_line=self.population_line_1,
            year=2026,
            value="1.50",
        )
        serializer = ScenarioYearlyCostAssignmentSerializer(assignment, context=self._context_for(self.user))
        self.assertEqual(serializer.data["value"], "150")

    def test_to_representation_does_not_modify_value_for_fixed_cost_lines(self):
        assignment = ScenarioYearlyCostAssignment.objects.create(
            scenario=self.scenario,
            cost_line=self.fixed_cost_line,
            year=2026,
            value="150",
        )
        serializer = ScenarioYearlyCostAssignmentSerializer(assignment, context=self._context_for(self.user))
        self.assertEqual(serializer.data["value"], "150")

    def test_create_is_scoped_to_scenario_and_cost_line_account(self):
        serializer = ScenarioYearlyCostAssignmentSerializer(
            data={
                "scenario": self.other_account_scenario.id,
                "year": 2026,
                "cost_line": self.population_line_1.id,
                "value": "12",
            },
            context=self._context_for(self.user),
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("scenario", serializer.errors)

        serializer = ScenarioYearlyCostAssignmentSerializer(
            data={
                "scenario": self.scenario.id,
                "year": 2026,
                "cost_line": self.other_account_cost_line.id,
                "value": "12",
            },
            context=self._context_for(self.user),
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("cost_line", serializer.errors)


class ScenarioYearlyCostAssignmentUpsertSerializerTests(ScenarioYearlyCostAssignmentSerializerBaseTestCase):
    def _base_data(self, cost_line=None, value="99"):
        return {
            "scenario": self.scenario.id,
            "cost_line": (cost_line or self.fixed_cost_line).id,
            "year": 2026,
            "value": value,
        }

    def test_save_creates_new_assignment(self):
        serializer = ScenarioYearlyCostAssignmentUpsertSerializer(
            data=self._base_data(self.fixed_cost_line, "50"),
            context=self._context_for(self.user),
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        result = serializer.save()
        self.assertEqual(result.scenario, self.scenario)
        self.assertEqual(result.cost_line, self.fixed_cost_line)
        self.assertEqual(result.year, 2026)
        self.assertEqual(str(result.value), "50.00")

    def test_save_updates_existing_assignment(self):
        existing = ScenarioYearlyCostAssignment.objects.create(
            scenario=self.scenario, cost_line=self.fixed_cost_line, year=2026, value="10.00"
        )
        serializer = ScenarioYearlyCostAssignmentUpsertSerializer(
            data=self._base_data(self.fixed_cost_line, "20.00"),
            context=self._context_for(self.user),
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        result = serializer.save()
        self.assertEqual(result.id, existing.id)
        self.assertEqual(str(result.value), "20.00")

    def test_save_divides_value_by_100_for_population_driver(self):
        serializer = ScenarioYearlyCostAssignmentUpsertSerializer(
            data=self._base_data(self.population_line_1, "75.00"),
            context=self._context_for(self.user),
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        result = serializer.save()
        self.assertEqual(str(result.value), "0.75")

    def test_save_does_not_divide_value_for_fixed_cost_driver(self):
        serializer = ScenarioYearlyCostAssignmentUpsertSerializer(
            data=self._base_data(self.fixed_cost_line, "500.00"),
            context=self._context_for(self.user),
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        result = serializer.save()
        self.assertEqual(str(result.value), "500.00")

    def test_patch_uses_instance_year_and_cost_line(self):
        assignment = ScenarioYearlyCostAssignment.objects.create(
            scenario=self.scenario, cost_line=self.fixed_cost_line, year=2026, value="10.00"
        )
        serializer = ScenarioYearlyCostAssignmentUpsertSerializer(
            instance=assignment,
            data={"scenario": self.scenario.id, "value": "50.00"},
            partial=True,
            context=self._context_for(self.user),
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        result = serializer.save()
        self.assertEqual(result.id, assignment.id)
        self.assertEqual(result.year, 2026)
        self.assertEqual(result.cost_line, self.fixed_cost_line)
        self.assertEqual(str(result.value), "50.00")

    def test_patch_without_value_leaves_value_unchanged(self):
        assignment = ScenarioYearlyCostAssignment.objects.create(
            scenario=self.scenario, cost_line=self.fixed_cost_line, year=2026, value="10.00"
        )
        serializer = ScenarioYearlyCostAssignmentUpsertSerializer(
            instance=assignment,
            data={"scenario": self.scenario.id},
            partial=True,
            context=self._context_for(self.user),
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        result = serializer.save()
        self.assertEqual(str(result.value), "10.00")

    def test_required_fields_are_enforced(self):
        for field_name in ("scenario", "cost_line", "year", "value"):
            with self.subTest(field_name=field_name):
                data = dict(self._base_data())
                data.pop(field_name)
                serializer = ScenarioYearlyCostAssignmentUpsertSerializer(
                    data=data, context=self._context_for(self.user)
                )
                self.assertFalse(serializer.is_valid())
                self.assertIn(field_name, serializer.errors)

    def test_reject_locked_scenario(self):
        serializer = ScenarioYearlyCostAssignmentUpsertSerializer(
            data={**self._base_data(), "scenario": self.locked_scenario.id},
            context=self._context_for(self.user),
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("scenario", serializer.errors)

    def test_rejects_scenario_from_other_account(self):
        serializer = ScenarioYearlyCostAssignmentUpsertSerializer(
            data={**self._base_data(), "scenario": self.other_account_scenario.id},
            context=self._context_for(self.user),
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("scenario", serializer.errors)

    def test_rejects_cost_line_from_other_account(self):
        serializer = ScenarioYearlyCostAssignmentUpsertSerializer(
            data={**self._base_data(), "cost_line": self.other_account_cost_line.id},
            context=self._context_for(self.user),
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("cost_line", serializer.errors)

    def test_value_must_be_decimal(self):
        serializer = ScenarioYearlyCostAssignmentUpsertSerializer(
            data={**self._base_data(), "value": "1a2,00"},
            context=self._context_for(self.user),
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("value", serializer.errors)
