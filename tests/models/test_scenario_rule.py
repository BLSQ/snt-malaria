from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import IntegrityError

from iaso.models import Account, OrgUnit
from iaso.test import TestCase
from iaso.utils.colors import DEFAULT_COLOR
from plugins.snt_malaria.models import Intervention, InterventionCategory, Scenario, ScenarioRule
from plugins.snt_malaria.models.scenario import ScenarioRuleInterventionProperties


class ScenarioRuleModelTestCase(TestCase):
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
        with self.assertRaisesMessage(ValidationError, "This field cannot be null."):
            ScenarioRule.objects.create(
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
        with self.assertRaisesMessage(ValidationError, "This field cannot be null."):
            ScenarioRule.objects.create(
                name="Rule with invalid matching criteria",
                priority=2,
                color="#FF0000",
                matching_criteria=None,
                created_by=self.user,
                scenario=self.scenario,
            )


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
