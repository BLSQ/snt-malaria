from iaso.test import IasoMigratorTestCase


class Test0068ConvertMatchAllRulesToInclusions(IasoMigratorTestCase):
    """Legacy {"all": true} rules become inclusion-only rules over the org units they already cover;
    other rules are left untouched."""

    migrate_from = ("snt_malaria", "0067_delete_scenarioyearlycostassignment")
    migrate_to = ("snt_malaria", "0068_convert_match_all_rules_to_inclusions")

    def prepare(self):
        Account = self.old_state.apps.get_model("iaso", "Account")
        User = self.old_state.apps.get_model("auth", "User")
        Scenario = self.old_state.apps.get_model("snt_malaria", "Scenario")
        ScenarioRule = self.old_state.apps.get_model("snt_malaria", "ScenarioRule")

        account = Account.objects.create(name="account")
        user = User.objects.create(username="user")
        scenario = Scenario.objects.create(
            account=account, created_by=user, name="Scenario", start_year=2025, end_year=2026
        )

        self.match_all_rule = ScenarioRule.objects.create(
            scenario=scenario,
            priority=1,
            created_by=user,
            matching_criteria={"all": True},
            org_units_matched=[3, 1, 2],
        )
        self.match_all_rule_with_overrides = ScenarioRule.objects.create(
            scenario=scenario,
            priority=2,
            created_by=user,
            matching_criteria={"all": True},
            org_units_matched=[1, 2, 3],
            org_units_excluded=[2],
            org_units_included=[4],
        )
        self.criteria = {"and": [{">": [{"var": 1}, 10]}]}
        self.criteria_rule = ScenarioRule.objects.create(
            scenario=scenario,
            priority=3,
            created_by=user,
            matching_criteria=self.criteria,
            org_units_matched=[1, 2],
            org_units_excluded=[2],
            org_units_included=[5],
        )
        self.inclusion_only_rule = ScenarioRule.objects.create(
            scenario=scenario,
            priority=4,
            created_by=user,
            matching_criteria=None,
            org_units_included=[6, 7],
        )

    def test_match_all_rule_becomes_inclusion_only_over_matched_org_units(self):
        ScenarioRule = self.new_state.apps.get_model("snt_malaria", "ScenarioRule")
        rule = ScenarioRule.objects.get(pk=self.match_all_rule.pk)

        self.assertIsNone(rule.matching_criteria)
        self.assertEqual(rule.org_units_included, [1, 2, 3])
        self.assertEqual(rule.org_units_matched, [])
        self.assertEqual(rule.org_units_excluded, [])

    def test_match_all_rule_folds_exclusions_and_inclusions_into_included(self):
        ScenarioRule = self.new_state.apps.get_model("snt_malaria", "ScenarioRule")
        rule = ScenarioRule.objects.get(pk=self.match_all_rule_with_overrides.pk)

        self.assertTrue(ScenarioRule.objects.filter(pk=rule.pk, matching_criteria__isnull=True).exists())
        self.assertEqual(rule.org_units_included, [1, 3, 4])
        self.assertEqual(rule.org_units_matched, [])
        self.assertEqual(rule.org_units_excluded, [])

    def test_criteria_and_inclusion_only_rules_are_untouched(self):
        ScenarioRule = self.new_state.apps.get_model("snt_malaria", "ScenarioRule")

        criteria_rule = ScenarioRule.objects.get(pk=self.criteria_rule.pk)
        self.assertEqual(criteria_rule.matching_criteria, self.criteria)
        self.assertEqual(criteria_rule.org_units_matched, [1, 2])
        self.assertEqual(criteria_rule.org_units_excluded, [2])
        self.assertEqual(criteria_rule.org_units_included, [5])

        inclusion_only_rule = ScenarioRule.objects.get(pk=self.inclusion_only_rule.pk)
        self.assertIsNone(inclusion_only_rule.matching_criteria)
        self.assertEqual(inclusion_only_rule.org_units_included, [6, 7])
