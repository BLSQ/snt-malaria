from decimal import Decimal

from django.contrib.gis.geos import Point
from django.core.exceptions import ValidationError
from django.db import IntegrityError

from iaso.models import Account, DataSource, OrgUnit, SourceVersion
from iaso.test import TestCase
from iaso.utils.colors import DEFAULT_COLOR
from plugins.snt_malaria.models import (
    Intervention,
    InterventionCategory,
    Scenario,
    ScenarioRule,
    ScenarioRuleInterventionProperties,
)


class ScenarioRuleModelTestCase(TestCase):
    def setUp(self):
        self.account = Account.objects.create(name="account")
        self.user = self.create_user_with_profile(username="user", account=self.account)
        self.intervention_category = InterventionCategory.objects.create(
            name="Category 1",
            account=self.account,
            created_by=self.user,
        )
        self.intervention = Intervention.objects.create(
            name="Intervention 1",
            code="INT1",
            intervention_category=self.intervention_category,
            created_by=self.user,
        )
        self.intervention_2 = Intervention.objects.create(
            name="Intervention 2",
            code="INT2",
            intervention_category=self.intervention_category,
            created_by=self.user,
        )
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
        with self.assertRaises(ValidationError):
            missing_name_rule = ScenarioRule.objects.create(
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
            missing_name_rule.full_clean()

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
        """Null matching_criteria is now valid (inclusion-only rule)."""
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


class ScenarioRuleMatchAllTestCase(TestCase):
    """Tests for refresh_assignments with matching_criteria={"all": True}."""

    def setUp(self):
        data_source = DataSource.objects.create(name="source")
        source_version = SourceVersion.objects.create(data_source=data_source, number=1)
        self.account = Account.objects.create(name="account", default_version=source_version)
        self.user = self.create_user_with_profile(username="user", account=self.account)

        self.intervention_category = InterventionCategory.objects.create(
            name="Category 1", account=self.account, created_by=self.user
        )
        self.intervention = Intervention.objects.create(
            name="Intervention 1",
            code="INT1",
            intervention_category=self.intervention_category,
            created_by=self.user,
        )
        self.scenario = Scenario.objects.create(
            account=self.account,
            created_by=self.user,
            name="Scenario 1",
            start_year=2020,
            end_year=2030,
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

    def test_refresh_assignments_match_all(self):
        rule = ScenarioRule.objects.create(
            name="Match all rule",
            priority=1,
            color="#00FF00",
            matching_criteria={"all": True},
            created_by=self.user,
            scenario=self.scenario,
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
        rule = ScenarioRule.objects.create(
            name="Match all with overrides",
            priority=1,
            color="#00FF00",
            matching_criteria={"all": True},
            created_by=self.user,
            scenario=self.scenario,
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


class ScenarioRuleInterventionPropertiesModelTestCase(TestCase):
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
            matching_criteria={"and": [{"==": [{"var": 1}, "F"]}, {"<": [{"var": 2}, 25]}]},
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
