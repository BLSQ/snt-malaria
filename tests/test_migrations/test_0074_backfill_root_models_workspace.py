from django.utils.timezone import now

from iaso.test import IasoMigratorTestCase


class Test0074BackfillRootModelsWorkspace(IasoMigratorTestCase):
    migrate_from = ("snt_malaria", "0073_add_workspace_to_root_models")
    migrate_to = ("snt_malaria", "0074_backfill_root_models_workspace")

    def prepare(self):
        Account = self.old_state.apps.get_model("iaso", "Account")
        Workspace = self.old_state.apps.get_model("iaso", "Workspace")
        User = self.old_state.apps.get_model("auth", "User")
        Scenario = self.old_state.apps.get_model("snt_malaria", "Scenario")
        InterventionCategory = self.old_state.apps.get_model("snt_malaria", "InterventionCategory")
        CostUnitType = self.old_state.apps.get_model("snt_malaria", "CostUnitType")
        Donor = self.old_state.apps.get_model("snt_malaria", "Donor")
        Grant = self.old_state.apps.get_model("snt_malaria", "Grant")
        CompositeLayer = self.old_state.apps.get_model("snt_malaria", "CompositeLayer")
        BudgetSettings = self.old_state.apps.get_model("snt_malaria", "BudgetSettings")

        user = User.objects.create(username="user")
        self.account = Account.objects.create(name="SNT account", modules=["SNT_MALARIA"])
        self.workspace = Workspace.objects.create(account=self.account, name="SNT account")
        self.account_without_module = Account.objects.create(name="Account without module")
        self.account_without_data = Account.objects.create(name="Account without data")

        self.rows = [
            Scenario.objects.create(account=self.account, created_by=user, name="S", start_year=2025, end_year=2026),
            Scenario.objects.create(
                account=self.account, created_by=user, name="Deleted", start_year=2025, end_year=2026, deleted_at=now()
            ),
            InterventionCategory.objects.create(account=self.account, created_by=user, name="Category"),
            CostUnitType.objects.create(account=self.account, name="per ITN"),
            CompositeLayer.objects.create(account=self.account, name="Composite"),
            BudgetSettings.objects.create(
                account=self.account, local_currency="XOF", exchange_rate="600", inflation_rate="0.03"
            ),
        ]
        donor = Donor.objects.create(account=self.account, name="Global Fund")
        self.rows += [donor, Grant.objects.create(account=self.account, donor=donor, name="NFM4")]
        self.orphan_donor = Donor.objects.create(account=self.account_without_module, name="PMI")

    def test_every_root_row_gets_its_account_first_workspace(self):
        for row in self.rows:
            model = self.new_state.apps.get_model("snt_malaria", row._meta.model_name)
            with self.subTest(model=row._meta.model_name, name=getattr(row, "name", None)):
                self.assertEqual(model.objects.get(pk=row.pk).workspace_id, self.workspace.id)

    def test_creates_a_workspace_for_accounts_holding_data_without_one(self):
        Workspace = self.new_state.apps.get_model("iaso", "Workspace")
        Donor = self.new_state.apps.get_model("snt_malaria", "Donor")

        workspace = Workspace.objects.get(account_id=self.account_without_module.id)
        self.assertEqual(workspace.name, "Account without module")
        self.assertEqual(Donor.objects.get(pk=self.orphan_donor.pk).workspace_id, workspace.id)
        self.assertFalse(Workspace.objects.filter(account_id=self.account_without_data.id).exists())
