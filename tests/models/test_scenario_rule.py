from decimal import Decimal

from django.contrib.gis.geos import Point
from django.core.exceptions import ValidationError
from django.db import IntegrityError

from iaso.models import Account, DataSource, MetricType, MetricValue, OrgUnit, OrgUnitType, SourceVersion
from iaso.utils.colors import DEFAULT_COLOR
from plugins.snt_malaria.models import (
    AccountSettings,
    BudgetAssumptions,
    ScenarioRule,
    ScenarioRuleInterventionProperties,
)
from plugins.snt_malaria.tests.common_base import SNTMalariaTestCase


class ScenarioRuleModelTestCase(SNTMalariaTestCase):
    auto_create_account = False

    def setUp(self):
        super().setUp()
        self.account, self.user = self.create_snt_account(name="account")
        self.intervention_category = self.create_snt_intervention_category(
            account=self.account, created_by=self.user, name="Category 1"
        )
        self.intervention = self.create_snt_intervention(
            intervention_category=self.intervention_category, created_by=self.user, name="Intervention 1", code="INT1"
        )
        self.intervention_2 = self.create_snt_intervention(
            intervention_category=self.intervention_category, created_by=self.user, name="Intervention 2", code="INT2"
        )
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
        self.matching_criteria = {
            "and": [{"==": [{"var": 1}, "F"]}, {"<": [{"var": 2}, 25]}, {"<=": [{"var": 3}, True]}]
        }

    def test_default_color(self):
        default_color_rule = ScenarioRule.objects.create(
            name="Rule with default color",
            priority=1,
            matching_criteria=self.matching_criteria,
            created_by=self.user,
            scenario=self.scenario,
            org_units_matched=[],
            org_units_excluded=[],
            org_units_included=[],
            org_units_scope=[],
        )
        self.assertEqual(default_color_rule.color, DEFAULT_COLOR)

    def test_missing_name_field(self):
        """Name is optional; rules without a name default to an empty string."""
        rule = ScenarioRule.objects.create(
            priority=1,
            color="#FF0000",
            matching_criteria=self.matching_criteria,
            created_by=self.user,
            scenario=self.scenario,
            org_units_matched=[],
            org_units_excluded=[],
            org_units_included=[],
            org_units_scope=[],
        )
        rule.full_clean()
        self.assertEqual(rule.name, "")

    def test_missing_matching_criteria_field(self):
        """Omitting matching_criteria defaults to None (inclusion-only rule)."""
        rule = ScenarioRule.objects.create(
            name="Rule 2",
            priority=1,
            color="#FF0000",
            created_by=self.user,
            scenario=self.scenario,
            org_units_matched=[],
            org_units_excluded=[],
            org_units_included=[],
            org_units_scope=[],
        )
        self.assertIsNone(rule.matching_criteria)

    def test_missing_priority_field(self):
        with self.assertRaisesMessage(ValidationError, "This field cannot be null."):
            ScenarioRule.objects.create(
                name="Rule 3",
                color="#FF0000",
                matching_criteria=self.matching_criteria,
                created_by=self.user,
                scenario=self.scenario,
                org_units_matched=[],
                org_units_excluded=[],
                org_units_included=[],
                org_units_scope=[],
            )

    def test_missing_optional_fields(self):
        rule_with_defaults = ScenarioRule.objects.create(
            name="Rule with defaults",
            priority=1,
            matching_criteria=self.matching_criteria,
            created_by=self.user,
            scenario=self.scenario,
        )
        self.assertEqual(rule_with_defaults.color, DEFAULT_COLOR)
        self.assertEqual(rule_with_defaults.org_units_matched, [])
        self.assertEqual(rule_with_defaults.org_units_excluded, [])
        self.assertEqual(rule_with_defaults.org_units_included, [])
        self.assertEqual(rule_with_defaults.org_units_scope, [])

    def test_unique_scenario_and_priority(self):
        rule_1 = ScenarioRule.objects.create(
            name="Rule 1",
            priority=1,
            color="#FF0000",
            matching_criteria=self.matching_criteria,
            created_by=self.user,
            scenario=self.scenario,
        )

        with self.assertRaisesMessage(IntegrityError, "scenario_rule_priority_unique"):
            ScenarioRule.objects.create(
                name="Rule 2 with same priority and scenario",
                priority=rule_1.priority,
                color="#FF0000",
                matching_criteria=self.matching_criteria,
                created_by=self.user,
                scenario=self.scenario,
            )

    def test_matching_criteria_none(self):
        """Null matching_criteria is valid (inclusion-only rule)."""
        rule = ScenarioRule.objects.create(
            name="Inclusion-only rule",
            priority=2,
            color="#FF0000",
            matching_criteria=None,
            created_by=self.user,
            scenario=self.scenario,
        )
        self.assertIsNone(rule.matching_criteria)

    def test_matching_criteria_match_all(self):
        rule = ScenarioRule.objects.create(
            name="Match all rule",
            priority=3,
            color="#00FF00",
            matching_criteria={"all": True},
            created_by=self.user,
            scenario=self.scenario,
        )
        self.assertEqual(rule.matching_criteria, {"all": True})

    def test_refresh_assignments_it_create_assignments(self):
        # This is a very basic test just to check that the method runs without error,
        # more complex logic should be tested in unit tests for this method
        rule = ScenarioRule.objects.create(
            name="Rule 1",
            priority=1,
            color="#FF0000",
            matching_criteria=self.matching_criteria,
            created_by=self.user,
            scenario=self.scenario,
            org_units_matched=[self.org_unit_1.id, self.org_unit_2.id],
        )

        ScenarioRuleInterventionProperties.objects.create(
            scenario_rule=rule,
            intervention=self.intervention,
            coverage=0.75,
        )

        rule.refresh_assignments(self.user, previous_assignments={})

        assignments = rule.intervention_assignments.all()
        self.assertEqual(assignments.count(), 2)

    def test_refresh_assignments_no_intervention_properties(self):
        rule = ScenarioRule.objects.create(
            name="Rule 1",
            priority=1,
            color="#FF0000",
            matching_criteria=self.matching_criteria,
            created_by=self.user,
            scenario=self.scenario,
            org_units_matched=[self.org_unit_1.id, self.org_unit_2.id],
        )

        rule.refresh_assignments(self.user, previous_assignments={})

        assignments = rule.intervention_assignments.all()
        self.assertEqual(assignments.count(), 0)

    def test_refresh_assignments_no_matched_org_unit(self):
        rule = ScenarioRule.objects.create(
            name="Rule 1",
            priority=1,
            color="#FF0000",
            matching_criteria=self.matching_criteria,
            created_by=self.user,
            scenario=self.scenario,
        )

        ScenarioRuleInterventionProperties.objects.create(
            scenario_rule=rule,
            intervention=self.intervention,
            coverage=0.75,
        )

        rule.refresh_assignments(self.user, previous_assignments={})

        assignments = rule.intervention_assignments.all()
        self.assertEqual(assignments.count(), 0)

    def test_refresh_assignments_overlap_with_previous_assignment(self):
        rule_1 = ScenarioRule.objects.create(
            name="Rule 1",
            priority=1,
            color="#FF0000",
            matching_criteria=self.matching_criteria,
            created_by=self.user,
            scenario=self.scenario,
            org_units_matched=[self.org_unit_1.id, self.org_unit_2.id],
        )

        ScenarioRuleInterventionProperties.objects.create(
            scenario_rule=rule_1,
            intervention=self.intervention,
            coverage=0.75,
        )

        previous_assignments = {self.intervention.intervention_category_id: {self.org_unit_1.id}}

        rule_1.refresh_assignments(self.user, previous_assignments=previous_assignments)

        assignments = rule_1.intervention_assignments.all()
        self.assertEqual(assignments.count(), 1)
        self.assertEqual(assignments.first().org_unit_id, self.org_unit_2.id)

    def test_refresh_assignments_dict_updated(self):
        rule_1 = ScenarioRule.objects.create(
            name="Rule 1",
            priority=1,
            color="#FF0000",
            matching_criteria=self.matching_criteria,
            created_by=self.user,
            scenario=self.scenario,
            org_units_matched=[self.org_unit_1.id, self.org_unit_2.id],
        )

        ScenarioRuleInterventionProperties.objects.create(
            scenario_rule=rule_1,
            intervention=self.intervention,
            coverage=0.75,
        )

        previous_assignments = {}

        rule_1.refresh_assignments(self.user, previous_assignments=previous_assignments)

        # After refreshing the assignments for rule 1, the dict should be updated to include the new assignments
        self.assertIn(self.intervention.intervention_category_id, previous_assignments)
        self.assertSetEqual(
            previous_assignments[self.intervention.intervention_category_id], {self.org_unit_1.id, self.org_unit_2.id}
        )

    def test_refresh_assignments_multiple_interventions_same_category(self):
        rule_1 = ScenarioRule.objects.create(
            name="Rule 1",
            priority=1,
            color="#FF0000",
            matching_criteria=self.matching_criteria,
            created_by=self.user,
            scenario=self.scenario,
            org_units_matched=[self.org_unit_1.id, self.org_unit_2.id],
        )

        ScenarioRuleInterventionProperties.objects.create(
            scenario_rule=rule_1,
            intervention=self.intervention,
            coverage=0.75,
        )

        ScenarioRuleInterventionProperties.objects.create(
            scenario_rule=rule_1,
            intervention=self.intervention_2,
            coverage=0.50,
        )

        previous_assignments = {}

        rule_1.refresh_assignments(self.user, previous_assignments=previous_assignments)

        # Even if there are 2 interventions in the same category, only 2 assignments should be created (one for each org unit) and not 4
        assignments = rule_1.intervention_assignments.all()
        self.assertEqual(assignments.count(), 2)
        self.assertEqual(
            set(assignments.values_list("org_unit_id", flat=True)), {self.org_unit_1.id, self.org_unit_2.id}
        )
        self.assertEqual(assignments.first().intervention_id, self.intervention.id)
        self.assertEqual(assignments[1].intervention_id, self.intervention.id)

    def test_refresh_assignments_multiple_rules_same_category(self):
        rule_1 = ScenarioRule.objects.create(
            name="Rule 1",
            priority=1,
            color="#FF0000",
            matching_criteria=self.matching_criteria,
            created_by=self.user,
            scenario=self.scenario,
            org_units_matched=[self.org_unit_1.id, self.org_unit_2.id],
        )

        rule_2 = ScenarioRule.objects.create(
            name="Rule 2",
            priority=2,
            color="#00FF00",
            matching_criteria=self.matching_criteria,
            created_by=self.user,
            scenario=self.scenario,
            org_units_matched=[self.org_unit_1.id, self.org_unit_2.id],
        )

        ScenarioRuleInterventionProperties.objects.create(
            scenario_rule=rule_1,
            intervention=self.intervention,
            coverage=0.75,
        )

        ScenarioRuleInterventionProperties.objects.create(
            scenario_rule=rule_2,
            intervention=self.intervention_2,
            coverage=0.50,
        )

        previous_assignments = {}

        rule_1.refresh_assignments(self.user, previous_assignments=previous_assignments)
        rule_2.refresh_assignments(self.user, previous_assignments=previous_assignments)

        assignments_rule_1 = rule_1.intervention_assignments.all()
        self.assertEqual(assignments_rule_1.count(), 2)
        self.assertEqual(
            set(assignments_rule_1.values_list("org_unit_id", flat=True)), {self.org_unit_1.id, self.org_unit_2.id}
        )
        self.assertEqual(assignments_rule_1.first().intervention_id, self.intervention.id)
        self.assertEqual(assignments_rule_1[1].intervention_id, self.intervention.id)

        assignments_rule_2 = rule_2.intervention_assignments.all()
        self.assertEqual(assignments_rule_2.count(), 0)

        self.assertEqual(
            previous_assignments[self.intervention.intervention_category_id], {self.org_unit_1.id, self.org_unit_2.id}
        )

    def test_refresh_assignments_included_org_units(self):
        rule = ScenarioRule.objects.create(
            name="Rule 1",
            priority=1,
            color="#FF0000",
            matching_criteria=self.matching_criteria,
            created_by=self.user,
            scenario=self.scenario,
            org_units_matched=[self.org_unit_1.id],
            org_units_included=[self.org_unit_2.id],
        )

        ScenarioRuleInterventionProperties.objects.create(
            scenario_rule=rule,
            intervention=self.intervention,
            coverage=0.75,
        )

        rule.refresh_assignments(self.user, previous_assignments={})

        assignments = rule.intervention_assignments.all()
        self.assertEqual(assignments.count(), 2)
        self.assertEqual(
            set(assignments.values_list("org_unit_id", flat=True)), {self.org_unit_1.id, self.org_unit_2.id}
        )

    def test_refresh_assignments_excluded_org_units(self):
        rule = ScenarioRule.objects.create(
            name="Rule 1",
            priority=1,
            color="#FF0000",
            matching_criteria=self.matching_criteria,
            created_by=self.user,
            scenario=self.scenario,
            org_units_matched=[self.org_unit_1.id, self.org_unit_2.id],
            org_units_excluded=[self.org_unit_2.id],
        )

        ScenarioRuleInterventionProperties.objects.create(
            scenario_rule=rule,
            intervention=self.intervention,
            coverage=0.75,
        )

        rule.refresh_assignments(self.user, previous_assignments={})

        assignments = rule.intervention_assignments.all()
        self.assertEqual(assignments.count(), 1)
        self.assertEqual(assignments.first().org_unit_id, self.org_unit_1.id)

    def test_refresh_assignments_excluded_org_units_over_included_org_units(self):
        # Inclusion takes precedence over exclusion, so even if org_unit_2 is in the excluded list,
        # it should still get the assignment because it's also in the included list
        rule = ScenarioRule.objects.create(
            name="Rule 1",
            priority=1,
            color="#FF0000",
            matching_criteria=self.matching_criteria,
            created_by=self.user,
            scenario=self.scenario,
            org_units_matched=[self.org_unit_1.id, self.org_unit_2.id],
            org_units_excluded=[self.org_unit_2.id],
            org_units_included=[self.org_unit_2.id],
        )

        ScenarioRuleInterventionProperties.objects.create(
            scenario_rule=rule,
            intervention=self.intervention,
            coverage=0.75,
        )

        rule.refresh_assignments(self.user, previous_assignments={})

        assignments = rule.intervention_assignments.all().order_by("org_unit_id")
        self.assertEqual(assignments.count(), 2)
        self.assertEqual(assignments.first().org_unit_id, self.org_unit_1.id)
        self.assertEqual(assignments[1].org_unit_id, self.org_unit_2.id)

    def test_refresh_assignments_inclusion_only(self):
        """matching_criteria=None: assignments come solely from org_units_included."""
        rule = ScenarioRule.objects.create(
            name="Inclusion-only rule",
            priority=1,
            color="#FF0000",
            matching_criteria=None,
            created_by=self.user,
            scenario=self.scenario,
            org_units_included=[self.org_unit_1.id, self.org_unit_2.id],
        )

        ScenarioRuleInterventionProperties.objects.create(
            scenario_rule=rule,
            intervention=self.intervention,
            coverage=0.75,
        )

        rule.refresh_assignments(self.user, previous_assignments={})

        assignments = rule.intervention_assignments.all()
        self.assertEqual(assignments.count(), 2)
        self.assertEqual(
            set(assignments.values_list("org_unit_id", flat=True)),
            {self.org_unit_1.id, self.org_unit_2.id},
        )

    def test_refresh_assignments_inclusion_only_empty(self):
        """matching_criteria=None with no org_units_included produces no assignments."""
        rule = ScenarioRule.objects.create(
            name="Empty inclusion rule",
            priority=1,
            color="#FF0000",
            matching_criteria=None,
            created_by=self.user,
            scenario=self.scenario,
        )

        ScenarioRuleInterventionProperties.objects.create(
            scenario_rule=rule,
            intervention=self.intervention,
            coverage=0.75,
        )

        rule.refresh_assignments(self.user, previous_assignments={})

        self.assertEqual(rule.intervention_assignments.count(), 0)

    def test_scenario_refresh_assignments_recreates_budget_assumptions_for_matching_org_units(self):
        rule = ScenarioRule.objects.create(
            name="Rule 1",
            priority=1,
            color="#FF0000",
            matching_criteria=self.matching_criteria,
            created_by=self.user,
            scenario=self.scenario,
            org_units_matched=[self.org_unit_1.id, self.org_unit_2.id],
        )

        ScenarioRuleInterventionProperties.objects.create(
            scenario_rule=rule,
            intervention=self.intervention,
            coverage=0.75,
        )

        self.scenario.refresh_assignments(self.user)
        first_assignment = self.scenario.intervention_assignments.first()
        BudgetAssumptions.objects.create(
            scenario=self.scenario,
            intervention_assignment=first_assignment,
            year=2025,
            coverage=Decimal("0.55"),
        )
        BudgetAssumptions.objects.create(
            scenario=self.scenario,
            intervention_assignment=first_assignment,
            year=2026,
            coverage=Decimal("0.65"),
        )

        self.scenario.refresh_assignments(self.user)

        assignments = self.scenario.intervention_assignments.filter(intervention=self.intervention)
        self.assertEqual(assignments.count(), 2)

        assumptions = BudgetAssumptions.objects.filter(
            scenario=self.scenario,
            intervention_assignment__in=assignments,
        )
        self.assertEqual(assumptions.count(), 4)

        by_assignment = {}
        for assumption in assumptions.values("intervention_assignment_id", "year", "coverage"):
            by_assignment.setdefault(assumption["intervention_assignment_id"], {})[assumption["year"]] = str(
                assumption["coverage"]
            )

        self.assertEqual(len(by_assignment), 2)
        for years in by_assignment.values():
            self.assertEqual(years, {2025: "0.55", 2026: "0.65"})

    def test_scenario_refresh_assignments_removes_budget_assumptions_without_matching_org_units(self):
        rule = ScenarioRule.objects.create(
            name="Rule 1",
            priority=1,
            color="#FF0000",
            matching_criteria=self.matching_criteria,
            created_by=self.user,
            scenario=self.scenario,
            org_units_matched=[self.org_unit_1.id, self.org_unit_2.id],
        )

        ScenarioRuleInterventionProperties.objects.create(
            scenario_rule=rule,
            intervention=self.intervention,
            coverage=0.75,
        )

        self.scenario.refresh_assignments(self.user)
        for assignment in self.scenario.intervention_assignments.all():
            BudgetAssumptions.objects.create(
                scenario=self.scenario,
                intervention_assignment=assignment,
                year=2025,
                coverage=Decimal("0.55"),
            )

        rule.org_units_matched = []
        rule.save()
        self.scenario.refresh_assignments(self.user)

        self.assertEqual(self.scenario.intervention_assignments.count(), 0)
        self.assertEqual(BudgetAssumptions.objects.filter(scenario=self.scenario).count(), 0)

    def test_scenario_refresh_assignments_moves_assumptions_when_org_units_shift_to_other_intervention(self):
        org_unit_3 = OrgUnit.objects.create(name="Org Unit 3")
        org_unit_4 = OrgUnit.objects.create(name="Org Unit 4")
        org_unit_5 = OrgUnit.objects.create(name="Org Unit 5")

        rule_for_intervention_1 = ScenarioRule.objects.create(
            name="Rule intervention 1",
            priority=2,
            color="#FF0000",
            matching_criteria=self.matching_criteria,
            created_by=self.user,
            scenario=self.scenario,
            org_units_matched=[self.org_unit_1.id, self.org_unit_2.id],
        )
        rule_for_intervention_2 = ScenarioRule.objects.create(
            name="Rule intervention 2",
            priority=1,
            color="#00FF00",
            matching_criteria=self.matching_criteria,
            created_by=self.user,
            scenario=self.scenario,
            org_units_matched=[org_unit_3.id, org_unit_4.id, org_unit_5.id],
        )

        ScenarioRuleInterventionProperties.objects.create(
            scenario_rule=rule_for_intervention_1,
            intervention=self.intervention,
            coverage=0.75,
        )
        ScenarioRuleInterventionProperties.objects.create(
            scenario_rule=rule_for_intervention_2,
            intervention=self.intervention_2,
            coverage=0.75,
        )

        self.scenario.refresh_assignments(self.user)

        assignments_intervention_1 = list(self.scenario.intervention_assignments.filter(intervention=self.intervention))
        assignments_intervention_2 = list(
            self.scenario.intervention_assignments.filter(intervention=self.intervention_2)
        )
        self.assertEqual(len(assignments_intervention_1), 2)
        self.assertEqual(len(assignments_intervention_2), 3)

        for assignment in assignments_intervention_1:
            BudgetAssumptions.objects.create(
                scenario=self.scenario,
                intervention_assignment=assignment,
                year=2025,
                coverage=Decimal("0.30"),
            )
        for assignment in assignments_intervention_2:
            BudgetAssumptions.objects.create(
                scenario=self.scenario,
                intervention_assignment=assignment,
                year=2025,
                coverage=Decimal("0.60"),
            )

        rule_for_intervention_1.org_units_matched = []
        rule_for_intervention_1.save()
        rule_for_intervention_2.org_units_matched = [
            self.org_unit_1.id,
            self.org_unit_2.id,
            org_unit_3.id,
            org_unit_4.id,
            org_unit_5.id,
        ]
        rule_for_intervention_2.save()

        self.scenario.refresh_assignments(self.user)

        assignments_after_move = self.scenario.intervention_assignments.all()
        self.assertEqual(assignments_after_move.count(), 5)
        self.assertFalse(assignments_after_move.filter(intervention=self.intervention).exists())
        self.assertEqual(assignments_after_move.filter(intervention=self.intervention_2).count(), 5)

        assumptions_after_move = BudgetAssumptions.objects.filter(scenario=self.scenario)
        self.assertEqual(assumptions_after_move.count(), 5)
        self.assertEqual(
            set(
                assumptions_after_move.values_list(
                    "intervention_assignment__intervention_id",
                    "year",
                    "coverage",
                )
            ),
            {(self.intervention_2.id, 2025, Decimal("0.60"))},
        )


class ScenarioRuleMatchAllTestCase(SNTMalariaTestCase):
    """Tests for refresh_assignments with matching_criteria={"all": True}."""

    auto_create_account = False

    def setUp(self):
        super().setUp()
        data_source = DataSource.objects.create(name="source")
        source_version = SourceVersion.objects.create(data_source=data_source, number=1)
        self.account = Account.objects.create(name="account", default_version=source_version)
        self.user = self.create_user_with_profile(username="user", account=self.account)

        self.intervention_category = self.create_snt_intervention_category(
            account=self.account, created_by=self.user, name="Category 1"
        )
        self.intervention = self.create_snt_intervention(
            intervention_category=self.intervention_category, created_by=self.user, name="Intervention 1", code="INT1"
        )
        self.scenario = self.create_snt_scenario(
            self.account, self.user, name="Scenario 1", start_year=2020, end_year=2030
        )

        self.org_unit_1 = OrgUnit.objects.create(
            name="OU 1",
            version=source_version,
            validation_status=OrgUnit.VALIDATION_VALID,
            location=Point(1.0, 2.0, 0.0),
        )
        self.org_unit_2 = OrgUnit.objects.create(
            name="OU 2",
            version=source_version,
            validation_status=OrgUnit.VALIDATION_VALID,
            location=Point(3.0, 4.0, 0.0),
        )
        self.org_unit_3 = OrgUnit.objects.create(
            name="OU 3",
            version=source_version,
            validation_status=OrgUnit.VALIDATION_VALID,
            location=Point(5.0, 6.0, 0.0),
        )

        metric_type = MetricType.objects.create(account=self.account, name="Population", code="POP", units="people")
        for org_unit in [self.org_unit_1, self.org_unit_2, self.org_unit_3]:
            MetricValue.objects.create(metric_type=metric_type, org_unit=org_unit, value=1000, year=2025)

    def test_refresh_assignments_match_all(self):
        rule = ScenarioRule.objects.create(
            name="Match all rule",
            priority=1,
            color="#00FF00",
            matching_criteria={"all": True},
            created_by=self.user,
            scenario=self.scenario,
            org_units_matched=[self.org_unit_1.id, self.org_unit_2.id, self.org_unit_3.id],
        )
        ScenarioRuleInterventionProperties.objects.create(
            scenario_rule=rule,
            intervention=self.intervention,
            coverage=Decimal("1.00"),
        )

        rule.refresh_assignments(self.user, previous_assignments={})

        self.assertEqual(rule.intervention_assignments.count(), 3)
        self.assertEqual(
            set(rule.intervention_assignments.values_list("org_unit_id", flat=True)),
            {self.org_unit_1.id, self.org_unit_2.id, self.org_unit_3.id},
        )

    def test_refresh_assignments_match_all_with_exclusions(self):
        rule = ScenarioRule.objects.create(
            name="Match all minus OU3",
            priority=1,
            color="#00FF00",
            matching_criteria={"all": True},
            created_by=self.user,
            scenario=self.scenario,
            org_units_matched=[self.org_unit_1.id, self.org_unit_2.id, self.org_unit_3.id],
            org_units_excluded=[self.org_unit_3.id],
        )
        ScenarioRuleInterventionProperties.objects.create(
            scenario_rule=rule,
            intervention=self.intervention,
            coverage=Decimal("1.00"),
        )

        rule.refresh_assignments(self.user, previous_assignments={})

        self.assertEqual(rule.intervention_assignments.count(), 2)
        self.assertEqual(
            set(rule.intervention_assignments.values_list("org_unit_id", flat=True)),
            {self.org_unit_1.id, self.org_unit_2.id},
        )

    def test_refresh_assignments_match_all_with_exclusion_and_inclusion(self):
        """Edge case: a match-all rule where the same org unit is both excluded and included.
        Not a typical user-created rule, but verifies that inclusion takes precedence over exclusion."""
        rule = ScenarioRule.objects.create(
            name="Match all with overrides",
            priority=1,
            color="#00FF00",
            matching_criteria={"all": True},
            created_by=self.user,
            scenario=self.scenario,
            org_units_matched=[self.org_unit_1.id, self.org_unit_2.id, self.org_unit_3.id],
            org_units_excluded=[self.org_unit_2.id],
            org_units_included=[self.org_unit_2.id],
        )
        ScenarioRuleInterventionProperties.objects.create(
            scenario_rule=rule,
            intervention=self.intervention,
            coverage=Decimal("1.00"),
        )

        rule.refresh_assignments(self.user, previous_assignments={})

        # Inclusion overrides exclusion
        self.assertEqual(rule.intervention_assignments.count(), 3)


class ScenarioRuleInterventionPropertiesModelTestCase(SNTMalariaTestCase):
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
            matching_criteria={"and": [{"==": [{"var": 1}, "F"]}, {"<": [{"var": 2}, 25]}]},
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

    def test_unique_intervention_and_rule(self):
        with self.assertRaisesMessage(IntegrityError, "scenario_rule_intervention_unique"):
            ScenarioRuleInterventionProperties.objects.create(
                scenario_rule=self.scenario_rule,
                intervention=self.intervention,
                coverage=0.80,
            )

    def test_negative_coverage(self):
        self.intervention_properties.delete()
        with self.assertRaisesMessage(ValidationError, "intervention_properties_coverage_between_0_and_1"):
            invalid_properties = ScenarioRuleInterventionProperties(
                scenario_rule=self.scenario_rule,
                intervention=self.intervention,
                coverage=Decimal("-0.1"),
            )
            invalid_properties.full_clean()

    def test_coverage_exceeds_1(self):
        self.intervention_properties.delete()
        with self.assertRaisesMessage(ValidationError, "intervention_properties_coverage_between_0_and_1"):
            invalid_properties = ScenarioRuleInterventionProperties(
                scenario_rule=self.scenario_rule,
                intervention=self.intervention,
                coverage=Decimal("1.1"),
            )
            invalid_properties.full_clean()


class ResolveMatchedOrgUnitsInterventionTypeScopeTestCase(SNTMalariaTestCase):
    """Tests that resolve_matched_org_units respects AccountSettings.intervention_org_unit_type."""

    auto_create_account = False

    def setUp(self):
        super().setUp()
        data_source = DataSource.objects.create(name="source")
        source_version = SourceVersion.objects.create(data_source=data_source, number=1)
        self.account = Account.objects.create(name="account", default_version=source_version)
        self.user = self.create_user_with_profile(username="user", account=self.account)

        self.region_type = OrgUnitType.objects.create(name="Region")
        self.district_type = OrgUnitType.objects.create(name="District")

        self.region = OrgUnit.objects.create(
            name="Region A",
            org_unit_type=self.region_type,
            version=source_version,
            validation_status=OrgUnit.VALIDATION_VALID,
            location=Point(1.0, 2.0, 0.0),
        )
        self.district_1 = OrgUnit.objects.create(
            name="District 1",
            org_unit_type=self.district_type,
            version=source_version,
            validation_status=OrgUnit.VALIDATION_VALID,
            location=Point(3.0, 4.0, 0.0),
        )
        self.district_2 = OrgUnit.objects.create(
            name="District 2",
            org_unit_type=self.district_type,
            version=source_version,
            validation_status=OrgUnit.VALIDATION_VALID,
            location=Point(5.0, 6.0, 0.0),
        )

        metric_type = MetricType.objects.create(account=self.account, name="Population", code="POP", units="people")
        MetricValue.objects.create(metric_type=metric_type, org_unit=self.region, value=50000, year=2025)
        MetricValue.objects.create(metric_type=metric_type, org_unit=self.district_1, value=20000, year=2025)
        MetricValue.objects.create(metric_type=metric_type, org_unit=self.district_2, value=30000, year=2025)

    def test_match_all_without_settings_returns_all_levels(self):
        result = ScenarioRule.resolve_matched_org_units(self.account, {"all": True})
        self.assertCountEqual(result, [self.region.id, self.district_1.id, self.district_2.id])

    def test_match_all_with_intervention_type_excludes_parent(self):
        AccountSettings.objects.create(account=self.account, intervention_org_unit_type=self.district_type)
        result = ScenarioRule.resolve_matched_org_units(self.account, {"all": True})
        self.assertCountEqual(result, [self.district_1.id, self.district_2.id])
        self.assertNotIn(self.region.id, result)

    def test_criteria_with_intervention_type_excludes_parent(self):
        metric_type = MetricType.objects.get(account=self.account, code="POP")
        AccountSettings.objects.create(account=self.account, intervention_org_unit_type=self.district_type)
        criteria = {"and": [{">=": [{"var": metric_type.id}, 1]}]}
        result = ScenarioRule.resolve_matched_org_units(self.account, criteria)
        self.assertCountEqual(result, [self.district_1.id, self.district_2.id])

    def test_null_criteria_returns_empty(self):
        AccountSettings.objects.create(account=self.account, intervention_org_unit_type=self.district_type)
        result = ScenarioRule.resolve_matched_org_units(self.account, None)
        self.assertEqual(result, [])

    def test_unified_pipeline_match_all_and_criteria_produce_same_intervention_scope(self):
        """Both match-all and JSONLogic go through the same pipeline and apply the
        intervention_org_unit_type filter, so when all org units
        satisfy a criteria, both modes return the exact same intervention-level set."""
        AccountSettings.objects.create(account=self.account, intervention_org_unit_type=self.district_type)
        metric_type = MetricType.objects.get(account=self.account, code="POP")

        match_all_result = ScenarioRule.resolve_matched_org_units(self.account, {"all": True})

        # ">=1" is satisfied by every org unit with a POP MetricValue (region + both districts),
        # so the only thing narrowing the result is the intervention_org_unit_type filter.
        criteria = {"and": [{">=": [{"var": metric_type.id}, 1]}]}
        criteria_result = ScenarioRule.resolve_matched_org_units(self.account, criteria)

        expected = [self.district_1.id, self.district_2.id]
        self.assertCountEqual(match_all_result, expected)
        self.assertCountEqual(criteria_result, expected)
        self.assertNotIn(self.region.id, match_all_result)
        self.assertNotIn(self.region.id, criteria_result)
