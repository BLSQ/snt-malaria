from decimal import Decimal

from django.core.exceptions import ValidationError

from iaso.models import Account, OrgUnit
from iaso.test import TestCase
from plugins.snt_malaria.models import (
    Intervention,
    InterventionAssignment,
    InterventionCategory,
    Scenario,
    ScenarioRule,
)
from plugins.snt_malaria.models.scenario import ScenarioRuleInterventionProperties


class InterventionAssignmentModelTestCase(TestCase):
    def setUp(self):
        self.account = Account.objects.create(name="account")
        self.user = self.create_user_with_profile(username="user", account=self.account)
        self.scenario = Scenario.objects.create(
            account=self.account,
            created_by=self.user,
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
        self.intervention_category = InterventionCategory.objects.create(
            name="Category 1",
            account=self.account,
            created_by=self.user,
        )
        self.intervention = Intervention.objects.create(
            name="Intervention 1",
            intervention_category=self.intervention_category,
            created_by=self.user,
        )
        self.intervention_properties = ScenarioRuleInterventionProperties.objects.create(
            scenario_rule=self.scenario_rule,
            intervention=self.intervention,
            coverage=0.75,
        )
        self.org_unit_1 = OrgUnit.objects.create(name="Org Unit 1")

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
