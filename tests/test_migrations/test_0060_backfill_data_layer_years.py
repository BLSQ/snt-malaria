from iaso.test import IasoMigratorTestCase


class Test0060BackfillDataLayerYears(IasoMigratorTestCase):
    """The old, single global `reference_year` field is dropped in favor of a per-metric-type
    `data_layer_years` map. Migrating scenarios that already have a `reference_year` set must
    stamp that year onto every metric type known to the scenario's account, so year-filtering
    behavior for existing scenarios doesn't silently disappear."""

    migrate_from = ("snt_malaria", "0059_compositelayer_legend_config_and_more")
    migrate_to = ("snt_malaria", "0060_remove_scenario_reference_year_and_more")

    def prepare(self):
        Account = self.old_state.apps.get_model("iaso", "Account")
        User = self.old_state.apps.get_model("auth", "User")
        MetricType = self.old_state.apps.get_model("iaso", "MetricType")
        Scenario = self.old_state.apps.get_model("snt_malaria", "Scenario")

        self.account = Account.objects.create(name="account")
        self.other_account = Account.objects.create(name="other_account")
        self.user = User.objects.create(username="user")

        self.metric_type_1 = MetricType.objects.create(account=self.account, name="Population", code="POP")
        self.metric_type_2 = MetricType.objects.create(account=self.account, name="ITN", code="ITN")
        # Belongs to a different account -- must not be included in this account's scenario.
        MetricType.objects.create(account=self.other_account, name="Other", code="OTHER")

        self.scenario_with_reference_year = Scenario.objects.create(
            account=self.account,
            created_by=self.user,
            name="With reference year",
            start_year=2024,
            end_year=2026,
            reference_year=2025,
        )
        self.scenario_without_reference_year = Scenario.objects.create(
            account=self.account,
            created_by=self.user,
            name="Without reference year",
            start_year=2024,
            end_year=2026,
            reference_year=None,
        )

    def test_migration(self):
        Scenario = self.new_state.apps.get_model("snt_malaria", "Scenario")

        scenario_with_reference_year = Scenario.objects.get(pk=self.scenario_with_reference_year.pk)
        self.assertEqual(
            scenario_with_reference_year.data_layer_years,
            {str(self.metric_type_1.pk): 2025, str(self.metric_type_2.pk): 2025},
        )

        scenario_without_reference_year = Scenario.objects.get(pk=self.scenario_without_reference_year.pk)
        self.assertEqual(scenario_without_reference_year.data_layer_years, {})
