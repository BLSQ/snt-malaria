from decimal import Decimal

from django.db import IntegrityError

from iaso.models import OrgUnit
from plugins.snt_malaria.models import (
    BudgetAssumptions,
    InterventionAssignment,
    Scenario,
    ScenarioRule,
    ScenarioRuleInterventionProperties,
)
from plugins.snt_malaria.tests.common_base import SNTMalariaTestCase


class ScenarioModelTestCase(SNTMalariaTestCase):
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
        self.org_unit_1 = OrgUnit.objects.create(name="Org Unit 1")
        self.org_unit_2 = OrgUnit.objects.create(name="Org Unit 2")
        self.org_unit_3 = OrgUnit.objects.create(name="Org Unit 3")
        self.matching_criteria = {
            "and": [{"==": [{"var": 1}, "F"]}, {"<": [{"var": 2}, 25]}, {"<=": [{"var": 3}, True]}]
        }
        self.scenario_rule_1 = ScenarioRule.objects.create(
            name="Rule 1",
            priority=1,
            color="#FF0000",
            matching_criteria=self.matching_criteria,
            org_units_matched=[self.org_unit_1.id, self.org_unit_2.id],
            created_by=self.user,
            scenario=self.scenario,
        )
        self.scenario_rule_2 = ScenarioRule.objects.create(
            name="Rule 2",
            priority=2,
            color="#00FF00",
            matching_criteria=self.matching_criteria,
            org_units_matched=[self.org_unit_2.id, self.org_unit_3.id],
            created_by=self.user,
            scenario=self.scenario,
        )

        self.intervention_category = self.create_snt_intervention_category(
            account=self.account, created_by=self.user, name="Category 1"
        )

        self.intervention_1 = self.create_snt_intervention(
            intervention_category=self.intervention_category, created_by=self.user, name="Intervention 1"
        )
        self.intervention_2 = self.create_snt_intervention(
            intervention_category=self.intervention_category, created_by=self.user, name="Intervention 2"
        )

        self.intervention_property_1 = ScenarioRuleInterventionProperties.objects.create(
            scenario_rule=self.scenario_rule_1,
            intervention=self.intervention_1,
            coverage=0.75,
        )
        self.intervention_property_2 = ScenarioRuleInterventionProperties.objects.create(
            scenario_rule=self.scenario_rule_2, intervention=self.intervention_2, coverage=0.5
        )

    def test_get_next_available_priority(self):
        next_priority = self.scenario.get_next_available_priority()
        self.assertEqual(next_priority, 3)

    def test_get_next_available_priority_no_rules(self):
        new_scenario = Scenario.objects.create(
            account=self.account,
            created_by=self.user,
            name="Scenario 2",
            description="Description of scenario 2",
            start_year=2020,
            end_year=2030,
        )
        next_priority = new_scenario.get_next_available_priority()
        self.assertEqual(next_priority, 1)

    def test_refresh_assignments(self):
        self.scenario.refresh_assignments(self.user)

        assignments = self.scenario.intervention_assignments.all()
        self.assertEqual(assignments.count(), 3)

    def test_get_assumptions_by_intervention_and_year(self):
        self.scenario.refresh_assignments(self.user)
        assignment = self.scenario.intervention_assignments.first()
        self.create_snt_budget_assumption(
            scenario=self.scenario,
            intervention_assignment=assignment,
            year=2025,
            coverage=0.8,
        )
        self.create_snt_budget_assumption(
            scenario=self.scenario,
            intervention_assignment=assignment,
            year=2026,
            coverage=0.6,
        )

        assumptions = self.scenario._get_assumptions_by_intervention_and_year_()
        intervention = assignment.intervention.id
        self.assertIn(intervention, assumptions)
        self.assertIn(2025, assumptions[intervention])
        self.assertIn(2026, assumptions[intervention])
        self.assertEqual(assumptions[intervention][2025], Decimal("0.80"))
        self.assertEqual(assumptions[intervention][2026], Decimal("0.60"))

    def test_restore_assumptions_after_refresh_assignments(self):
        self.scenario.refresh_assignments(self.user)
        assignment = self.scenario.intervention_assignments.first()
        self.create_snt_budget_assumption(
            scenario=self.scenario,
            intervention_assignment=assignment,
            year=2025,
            coverage=0.8,
        )
        self.create_snt_budget_assumption(
            scenario=self.scenario,
            intervention_assignment=assignment,
            year=2026,
            coverage=0.6,
        )

        # Verify that we have the assumptions in the DB
        self.assertEqual(assignment.budget_assumptions.count(), 2)

        # Refresh assignments again, which should trigger the restoration of assumptions
        self.scenario.refresh_assignments(self.user)
        refreshed_assignment = InterventionAssignment.objects.get(
            scenario=self.scenario, org_unit=assignment.org_unit, intervention=assignment.intervention
        )
        self.assertEqual(refreshed_assignment.budget_assumptions.count(), 2)

        # Check that assumptions have same values but different IDs (i.e. they were deleted and recreated)
        assumptions = refreshed_assignment.budget_assumptions.all()
        assumption_2025 = assumptions.get(year=2025)
        assumption_2026 = assumptions.get(year=2026)
        self.assertEqual(assumption_2025.coverage, Decimal("0.80"))
        self.assertEqual(assumption_2026.coverage, Decimal("0.60"))

        # Delete manually assumptions and restore them with the helper method
        assignment_coverages = self.scenario._get_assumptions_by_intervention_and_year_()
        BudgetAssumptions.objects.all().delete()
        self.scenario._restore_assumptions_for_all_assignments_(assignment_coverages)
        refreshed_assignment_2 = InterventionAssignment.objects.get(
            scenario=self.scenario, org_unit=assignment.org_unit, intervention=assignment.intervention
        )
        self.assertEqual(refreshed_assignment_2.budget_assumptions.count(), 2)
        assumptions = refreshed_assignment_2.budget_assumptions.all()
        self.assertEqual(assumptions[0].coverage, Decimal("0.80"))
        self.assertEqual(assumptions[1].coverage, Decimal("0.60"))

    def test_refresh_assignments_priority_ordering(self):
        """
        Makes sure that the rules are applied with the highest priority first.
        Both rules target org unit 2, with an intervention that belongs to the same category.
        Only rule 2 should create an assignment for org unit 2.
        """
        self.scenario.refresh_assignments(self.user)

        assignments = self.scenario.intervention_assignments.all()
        self.assertEqual(assignments.count(), 3)

        assignments_rule_2 = assignments.filter(rule=self.scenario_rule_2)
        self.assertEqual(assignments_rule_2.count(), 2)
        org_unit_ids = assignments_rule_2.values_list("org_unit_id", flat=True)
        self.assertCountEqual(org_unit_ids, self.scenario_rule_2.org_units_matched)

        assignments_rule_1 = assignments.filter(rule=self.scenario_rule_1)
        self.assertEqual(assignments_rule_1.count(), 1)
        org_unit_ids = assignments_rule_1.values_list("org_unit_id", flat=True)
        self.assertCountEqual(
            org_unit_ids, [self.org_unit_1.id]
        )  # org unit 2 is not there, because it was already covered by rule 2

        self.assertFalse(
            InterventionAssignment.objects.filter(rule=self.scenario_rule_1, org_unit=self.org_unit_2).exists()
        )

    def test_reuse_soft_deleted_scenario_names(self):
        self.scenario.delete()
        new_scenario = Scenario.objects.create(
            account=self.account,
            created_by=self.user,
            name=self.scenario.name,  # same name
            description="Description of new scenario",
            start_year=2021,
            end_year=2031,
        )
        new_scenario.full_clean()
        self.assertEqual(new_scenario.name, self.scenario.name)

        # this can be done multiple times in a row
        new_scenario.delete()
        another_scenario = Scenario.objects.create(
            account=self.account,
            created_by=self.user,
            name=self.scenario.name,
            description="Description of another scenario",
            start_year=2021,
            end_year=2031,
        )
        another_scenario.full_clean()
        self.assertEqual(another_scenario.name, self.scenario.name)
        self.assertEqual(another_scenario.name, new_scenario.name)

    def test_account_name_unicity_not_soft_deleted(self):
        with self.assertRaisesMessage(IntegrityError, "scenario_name_account_unique"):
            Scenario.objects.create(
                account=self.account,
                created_by=self.user,
                name=self.scenario.name,
                description="Oh nooooo, I'm stealing a scenario name :(",
                start_year=2021,
                end_year=2031,
            )
