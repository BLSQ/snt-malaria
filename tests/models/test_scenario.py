from iaso.models import Account, OrgUnit
from iaso.test import TestCase
from plugins.snt_malaria.models import (
    InterventionAssignment,
    Scenario,
    ScenarioRule,
    ScenarioRuleInterventionProperties,
)
from plugins.snt_malaria.models.intervention import Intervention, InterventionCategory


class ScenarioModelTestCase(TestCase):
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

        self.intervention_category = InterventionCategory.objects.create(
            name="Category 1",
            account=self.account,
            created_by=self.user,
        )

        self.intervention_1 = Intervention.objects.create(
            created_by=self.user,
            name="Intervention 1",
            intervention_category=self.intervention_category,
        )
        self.intervention_2 = Intervention.objects.create(
            created_by=self.user,
            name="Intervention 2",
            intervention_category=self.intervention_category,
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
