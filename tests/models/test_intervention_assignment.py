from decimal import Decimal

from django.core.exceptions import ValidationError

from iaso.models import OrgUnit
from plugins.snt_malaria.models import (
    BudgetAssumptions,
    InterventionAssignment,
    ScenarioRule,
)
from plugins.snt_malaria.models.scenario import ScenarioRuleInterventionProperties
from plugins.snt_malaria.tests.common_base import SNTMalariaTestCase


class InterventionAssignmentModelTestCase(SNTMalariaTestCase):
    auto_create_account = False

    def setUp(self):
        super().setUp()
        self.account, self.user = self.create_snt_account(name="account")
        self.scenario = self.create_snt_scenario(
            self.account,
            self.user,
            name="Scenario 1",
            description="Description of scenario 1",
            start_year=2020,
            end_year=2030,
        )
        self.scenario_rule = ScenarioRule.objects.create(
            name="Rule 1",
            priority=1,
            color="#FF0000",
            matching_criteria={"and": [{"==": [{"var": 2}, "F"]}, {"<": [{"var": 4}, 25]}]},
            created_by=self.user,
            scenario=self.scenario,
            org_units_matched=[],
            org_units_excluded=[],
            org_units_included=[],
            org_units_scope=[],
        )
        self.intervention_category = self.create_snt_intervention_category(
            account=self.account, created_by=self.user, name="Category 1"
        )
        self.intervention = self.create_snt_intervention(
            intervention_category=self.intervention_category, created_by=self.user, name="Intervention 1"
        )
        self.intervention_properties = ScenarioRuleInterventionProperties.objects.create(
            scenario_rule=self.scenario_rule,
            intervention=self.intervention,
            coverage=0.75,
        )
        self.org_unit_1 = OrgUnit.objects.create(name="Org Unit 1")
        self.org_unit_2 = OrgUnit.objects.create(name="Org Unit 2")

    def test_backward_compatibility(self):
        count_before = InterventionAssignment.objects.count()
        InterventionAssignment.objects.create(
            scenario=self.scenario,
            org_unit=self.org_unit_1,
            intervention=self.intervention,
            created_by=self.user,
            # no coverage or other BudgetAssumptions field
        )
        count_after = InterventionAssignment.objects.count()
        self.assertEqual(count_after, count_before + 1)

    def test_coverage_negative(self):
        with self.assertRaisesMessage(ValidationError, "assignment_coverage_between_0_and_1"):
            invalid_assignment = InterventionAssignment(
                scenario=self.scenario,
                org_unit=self.org_unit_1,
                intervention=self.intervention,
                rule=self.scenario_rule,
                coverage=Decimal("-0.1"),
                created_by=self.user,
            )
            invalid_assignment.full_clean()

    def test_coverage_exceeds_1(self):
        with self.assertRaisesMessage(ValidationError, "assignment_coverage_between_0_and_1"):
            invalid_assignment = InterventionAssignment(
                scenario=self.scenario,
                org_unit=self.org_unit_1,
                intervention=self.intervention,
                rule=self.scenario_rule,
                coverage=Decimal("1.1"),
                created_by=self.user,
            )
            invalid_assignment.full_clean()

    def test_delete_rule_cascades_to_assignments(self):
        new_assignment = InterventionAssignment.objects.create(
            scenario=self.scenario,
            org_unit=self.org_unit_1,
            intervention=self.intervention,
            rule=self.scenario_rule,
            coverage=Decimal("0.5"),
            created_by=self.user,
        )
        self.assertEqual(InterventionAssignment.objects.count(), 1)

        self.scenario_rule.delete()
        self.assertEqual(InterventionAssignment.objects.count(), 0)

        with self.assertRaises(InterventionAssignment.DoesNotExist):
            InterventionAssignment.objects.get(id=new_assignment.id)

    def test_delete_assignment_cascades_to_assumptions(self):
        assignment_a = InterventionAssignment.objects.create(
            scenario=self.scenario,
            org_unit=self.org_unit_1,
            intervention=self.intervention,
            rule=self.scenario_rule,
            coverage=Decimal("0.5"),
            created_by=self.user,
        )
        assignment_b = InterventionAssignment.objects.create(
            scenario=self.scenario,
            org_unit=self.org_unit_2,
            intervention=self.intervention,
            rule=self.scenario_rule,
            coverage=Decimal("0.5"),
            created_by=self.user,
        )
        BudgetAssumptions.objects.create(
            scenario=self.scenario,
            intervention_assignment=assignment_a,
            year=2025,
            coverage=0.10,
        )
        BudgetAssumptions.objects.create(
            scenario=self.scenario,
            intervention_assignment=assignment_a,
            year=2026,
            coverage=0.30,
        )
        BudgetAssumptions.objects.create(
            scenario=self.scenario,
            intervention_assignment=assignment_b,
            year=2025,
            coverage=0.20,
        )

        assignment_b.delete()  # Simulate removing assignment_b from the scenario

        assumptions = BudgetAssumptions.objects.filter(scenario=self.scenario)
        self.assertEqual(assumptions.count(), 2)  # Only the assumptions related to assignment_b should be deleted
        for assumption in assumptions:
            self.assertEqual(assumption.intervention_assignment, assignment_a)
