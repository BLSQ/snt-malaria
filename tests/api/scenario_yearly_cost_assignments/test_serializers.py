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
    def test_create_is_scoped_to_scenario_and_cost_line_account(self):
        serializer = ScenarioYearlyCostAssignmentSerializer(
            data={
                "scenario": self.other_account_scenario.id,
                "year": 2026,
                "cost_line": self.population_line_1.id,
                "value": "12.00",
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
                "value": "12.00",
            },
            context=self._context_for(self.user),
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("cost_line", serializer.errors)


class ScenarioYearlyCostAssignmentUpsertManySerializerTests(ScenarioYearlyCostAssignmentSerializerBaseTestCase):
    def test_save_updates_population_lines_for_current_scenario_only(self):
        ScenarioYearlyCostAssignment.objects.create(
            scenario=self.scenario,
            cost_line=self.population_line_1,
            year=2026,
            value="1.00",
        )
        ScenarioYearlyCostAssignment.objects.create(
            scenario=self.scenario,
            cost_line=self.population_line_2,
            year=2026,
            value="2.00",
        )
        ScenarioYearlyCostAssignment.objects.create(
            scenario=self.scenario,
            cost_line=self.fixed_cost_line,
            year=2026,
            value="3.00",
        )
        ScenarioYearlyCostAssignment.objects.create(
            scenario=self.other_user_scenario,
            cost_line=self.population_line_1,
            year=2026,
            value="4.00",
        )

        serializer = ScenarioYearlyCostAssignmentUpsertSerializer(
            data={
                "intervention": self.intervention.id,
                "scenario": self.scenario.id,
                "year": 2026,
                "value": "99.00",
            },
            context=self._context_for(self.user),
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)

        result = serializer.save()

        self.assertEqual(len(result), 2)

        current_scenario_assignments = ScenarioYearlyCostAssignment.objects.filter(
            scenario=self.scenario,
            year=2026,
        )
        self.assertEqual(current_scenario_assignments.count(), 3)

        updated_line_1 = current_scenario_assignments.get(cost_line=self.population_line_1)
        updated_line_2 = current_scenario_assignments.get(cost_line=self.population_line_2)
        unchanged_fixed_line = current_scenario_assignments.get(cost_line=self.fixed_cost_line)

        other_scenario_assignment = ScenarioYearlyCostAssignment.objects.get(
            scenario=self.other_user_scenario,
            cost_line=self.population_line_1,
            year=2026,
        )

        self.assertEqual(str(updated_line_1.value), "99.00")
        self.assertEqual(str(updated_line_2.value), "99.00")
        self.assertEqual(str(unchanged_fixed_line.value), "3.00")
        self.assertEqual(str(other_scenario_assignment.value), "4.00")

    def test_save_updates_only_the_given_cost_line_when_cost_line_is_provided(self):
        ScenarioYearlyCostAssignment.objects.create(
            scenario=self.scenario,
            cost_line=self.population_line_1,
            year=2026,
            value="1.00",
        )
        ScenarioYearlyCostAssignment.objects.create(
            scenario=self.scenario,
            cost_line=self.population_line_2,
            year=2026,
            value="2.00",
        )
        ScenarioYearlyCostAssignment.objects.create(
            scenario=self.scenario,
            cost_line=self.fixed_cost_line,
            year=2026,
            value="3.00",
        )

        serializer = ScenarioYearlyCostAssignmentUpsertSerializer(
            data={
                "intervention": self.intervention.id,
                "scenario": self.scenario.id,
                "cost_line": self.fixed_cost_line.id,
                "year": 2026,
                "value": "99.00",
            },
            context=self._context_for(self.user),
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)

        result = serializer.save()

        self.assertEqual(len(result), 1)

        current_scenario_assignments = ScenarioYearlyCostAssignment.objects.filter(
            scenario=self.scenario,
            year=2026,
        )
        self.assertEqual(current_scenario_assignments.count(), 3)

        changed_fixed_line = current_scenario_assignments.get(cost_line=self.fixed_cost_line)
        unchanged_line_1 = current_scenario_assignments.get(cost_line=self.population_line_1)
        unchanged_line_2 = current_scenario_assignments.get(cost_line=self.population_line_2)

        self.assertEqual(str(changed_fixed_line.value), "99.00")
        self.assertEqual(str(unchanged_line_1.value), "1.00")
        self.assertEqual(str(unchanged_line_2.value), "2.00")

    def test_validate_rejects_intervention_without_cost_breakdown_lines(self):
        empty_intervention = self.create_snt_intervention(
            name="Empty Intervention",
            intervention_category=self.category,
            code="empty_intervention",
        )

        serializer = ScenarioYearlyCostAssignmentUpsertSerializer(
            data={
                "intervention": empty_intervention.id,
                "scenario": self.scenario.id,
                "year": 2026,
                "value": "99.00",
            },
            context=self._context_for(self.user),
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("intervention", serializer.errors)

    def test_required_fields_are_enforced(self):
        base_data = {
            "intervention": self.intervention.id,
            "scenario": self.scenario.id,
            "year": 2026,
            "value": "99.00",
        }

        for field_name in ("intervention", "scenario", "year", "value"):
            with self.subTest(field_name=field_name):
                data = dict(base_data)
                data.pop(field_name)

                serializer = ScenarioYearlyCostAssignmentUpsertSerializer(
                    data=data,
                    context=self._context_for(self.user),
                )

                self.assertFalse(serializer.is_valid())
                self.assertIn(field_name, serializer.errors)

    def test_rejects_intervention_from_other_account(self):
        serializer = ScenarioYearlyCostAssignmentUpsertSerializer(
            data={
                "intervention": self.other_account_intervention.id,
                "scenario": self.scenario.id,
                "year": 2026,
                "value": "99.00",
            },
            context=self._context_for(self.user),
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("intervention", serializer.errors)

    def test_reject_locked_scenario(self):
        serializer = ScenarioYearlyCostAssignmentUpsertSerializer(
            data={
                "intervention": self.intervention.id,
                "scenario": self.locked_scenario.id,
                "year": 2026,
                "value": "99.00",
            },
            context=self._context_for(self.user),
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("scenario", serializer.errors)

    def test_rejects_scenario_from_other_account(self):
        serializer = ScenarioYearlyCostAssignmentUpsertSerializer(
            data={
                "intervention": self.intervention.id,
                "scenario": self.other_account_scenario.id,
                "year": 2026,
                "value": "99.00",
            },
            context=self._context_for(self.user),
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("scenario", serializer.errors)

    def test_value_must_be_decimal(self):
        serializer = ScenarioYearlyCostAssignmentUpsertSerializer(
            data={
                "intervention": self.intervention.id,
                "scenario": self.scenario.id,
                "year": 2026,
                "value": "1a2,00",
            },
            context=self._context_for(self.user),
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("value", serializer.errors)

    def test_cost_line_other_account(self):
        serializer = ScenarioYearlyCostAssignmentUpsertSerializer(
            data={
                "intervention": self.intervention.id,
                "scenario": self.scenario.id,
                "cost_line": self.other_account_cost_line.id,
                "year": 2026,
                "value": "99.00",
            },
            context=self._context_for(self.user),
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("cost_line", serializer.errors)

    def test_cost_line_not_belonging_to_intervention(self):
        other_intervention_cost_line = self.create_snt_intervention(
            name="Other Intervention",
            intervention_category=self.category,
            code="other_intervention",
        ).cost_breakdown_lines.create(
            name="Other Intervention Cost Line",
            category="Procurement",
            cost_driver=InterventionCostBreakdownLine.CostDriver.POPULATION,
            unit_cost=50,
            unit_type=self.unit_type,
            created_by=self.user,
        )

        serializer = ScenarioYearlyCostAssignmentUpsertSerializer(
            data={
                "intervention": self.intervention.id,
                "scenario": self.scenario.id,
                "cost_line": other_intervention_cost_line.id,
                "year": 2026,
                "value": "99.00",
            },
            context=self._context_for(self.user),
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("cost_line", serializer.errors)

    def test_cost_line_must_be_fixed_cost_when_provided(self):
        serializer = ScenarioYearlyCostAssignmentUpsertSerializer(
            data={
                "intervention": self.intervention.id,
                "scenario": self.scenario.id,
                "cost_line": self.population_line_1.id,
                "year": 2026,
                "value": "99.00",
            },
            context=self._context_for(self.user),
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("cost_line", serializer.errors)
