from iaso.models import Account
from iaso.test import TestCase
from plugins.snt_malaria.api.scenarios.utils import duplicate_rules
from plugins.snt_malaria.models import (
    Intervention,
    InterventionCategory,
    Scenario,
    ScenarioRule,
    ScenarioRuleInterventionProperties,
)


class ScenarioAPIUtilsTestCase(TestCase):
    def setUp(self):
        self.account = Account.objects.create(name="account")
        self.user_1 = self.create_user_with_profile(username="user_1", account=self.account)
        self.user_2 = self.create_user_with_profile(username="user_2", account=self.account)

        # Create intervention categories
        self.int_category_vaccination = InterventionCategory.objects.create(
            name="Vaccination",
            account=self.account,
            created_by=self.user_1,
        )

        self.int_category_chemoprevention = InterventionCategory.objects.create(
            name="Preventive Chemotherapy",
            account=self.account,
            created_by=self.user_1,
        )

        # Create interventions
        self.intervention_vaccination_rts = Intervention.objects.create(
            name="RTS,S",
            created_by=self.user_1,
            intervention_category=self.int_category_vaccination,
            code="rts_s",
        )
        self.intervention_chemo_smc = Intervention.objects.create(
            name="SMC",
            created_by=self.user_1,
            intervention_category=self.int_category_chemoprevention,
            code="smc",
        )
        self.intervention_chemo_iptp = Intervention.objects.create(
            name="IPTp",
            created_by=self.user_1,
            intervention_category=self.int_category_chemoprevention,
            code="iptp",
        )

        self.scenario_1 = Scenario.objects.create(
            name="Scenario 1",
            created_by=self.user_1,
            account=self.account,
            start_year=2024,
            end_year=2026,
        )
        self.rule_1 = ScenarioRule.objects.create(
            name="Rule 1",
            priority=1,
            color="#FF0000",
            matching_criteria={"and": [{"==": [{"var": 2}, "F"]}]},
            created_by=self.user_1,
            scenario=self.scenario_1,
            org_units_matched=[1, 2, 3],
            org_units_excluded=[],
            org_units_included=[7],
            org_units_scope=[1, 2, 3, 7],
            updated_by=self.user_1,
        )
        self.intervention_properties_1 = ScenarioRuleInterventionProperties.objects.create(
            scenario_rule=self.rule_1,
            intervention=self.intervention_chemo_iptp,
            coverage=0.8,
        )
        self.intervention_properties_2 = ScenarioRuleInterventionProperties.objects.create(
            scenario_rule=self.rule_1,
            intervention=self.intervention_vaccination_rts,
            coverage=0.8,
        )
        self.rule_2 = ScenarioRule.objects.create(
            name="Rule 2",
            priority=2,
            color="#00FF00",
            matching_criteria={"and": [{">=": [{"var": 2}, 10]}]},
            created_by=self.user_1,
            scenario=self.scenario_1,
            org_units_matched=[4, 5, 6],
            org_units_excluded=[7],
            org_units_included=[9],
            org_units_scope=[],
        )
        self.intervention_properties_3 = ScenarioRuleInterventionProperties.objects.create(
            scenario_rule=self.rule_2,
            intervention=self.intervention_chemo_smc,
            coverage=0.9,
        )

    def test_duplicate_rules(self):
        scenario_2 = Scenario.objects.create(
            name="Scenario 2",
            created_by=self.user_1,
            account=self.account,
            start_year=2024,
            end_year=2026,
        )

        duplicate_rules(self.scenario_1, scenario_2, self.user_2)

        # Fetch the duplicated rules for scenario_2
        duplicated_rules = ScenarioRule.objects.filter(scenario=scenario_2).order_by("priority")

        # Check that the number of duplicated rules is the same as the original
        self.assertEqual(duplicated_rules.count(), 2)

        # Check that the properties of the duplicated rules are the same as the original
        for original_rule, duplicated_rule in zip(
            ScenarioRule.objects.filter(scenario=self.scenario_1).order_by("priority"), duplicated_rules
        ):
            # Checking copied values
            self.assertEqual(original_rule.name, duplicated_rule.name)
            self.assertEqual(original_rule.priority, duplicated_rule.priority)
            self.assertEqual(original_rule.color, duplicated_rule.color)
            self.assertEqual(original_rule.matching_criteria, duplicated_rule.matching_criteria)
            self.assertEqual(original_rule.org_units_matched, duplicated_rule.org_units_matched)
            self.assertEqual(original_rule.org_units_excluded, duplicated_rule.org_units_excluded)
            self.assertEqual(original_rule.org_units_included, duplicated_rule.org_units_included)
            self.assertEqual(original_rule.org_units_scope, duplicated_rule.org_units_scope)

            # Different values
            self.assertNotEqual(original_rule.created_by, duplicated_rule.created_by)
            self.assertNotEqual(original_rule.id, duplicated_rule.id)
            self.assertNotEqual(original_rule.created_at, duplicated_rule.created_at)
            self.assertNotEqual(original_rule.updated_at, duplicated_rule.updated_at)

            # Specific values of duplicated rule
            self.assertEqual(duplicated_rule.created_by, self.user_2)
            self.assertIsNone(duplicated_rule.updated_by)

            original_intervention_properties = ScenarioRuleInterventionProperties.objects.filter(
                scenario_rule=original_rule
            ).order_by("id")
            duplicated_intervention_properties = ScenarioRuleInterventionProperties.objects.filter(
                scenario_rule=duplicated_rule
            ).order_by("id")

            self.assertEqual(original_intervention_properties.count(), duplicated_intervention_properties.count())

            for original_prop, duplicated_prop in zip(
                original_intervention_properties, duplicated_intervention_properties
            ):
                self.assertEqual(original_prop.intervention_id, duplicated_prop.intervention_id)
                self.assertEqual(original_prop.coverage, duplicated_prop.coverage)
                self.assertNotEqual(original_prop.id, duplicated_prop.id)
                self.assertNotEqual(original_prop.created_at, duplicated_prop.created_at)
                self.assertNotEqual(original_prop.updated_at, duplicated_prop.updated_at)

    def test_duplicate_scenario_no_rules(self):
        scenario_3 = Scenario.objects.create(
            name="Scenario 3",
            created_by=self.user_1,
            account=self.account,
            start_year=2024,
            end_year=2026,
        )
        new_scenario = Scenario.objects.create(
            name="New Scenario",
            created_by=self.user_1,
            account=self.account,
            start_year=2024,
            end_year=2026,
        )

        duplicate_rules(scenario_3, new_scenario, self.user_2)

        duplicated_rules = ScenarioRule.objects.filter(scenario=new_scenario)
        self.assertEqual(duplicated_rules.count(), 0)
