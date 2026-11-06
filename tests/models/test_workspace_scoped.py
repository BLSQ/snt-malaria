from iaso.models import Account, Workspace
from plugins.snt_malaria.models import BudgetSettings, Donor
from plugins.snt_malaria.tests.common_base import SNTMalariaTestCase


class WorkspaceFromAccountMixinTestCase(SNTMalariaTestCase):
    def test_root_row_saved_with_account_only_gets_the_account_first_workspace(self):
        self.create_snt_workspace(name="Second workspace")

        donor = Donor.objects.create(account=self.account, name="Global Fund")

        self.assertEqual(donor.workspace, self.workspace)

    def test_explicit_workspace_is_kept(self):
        second_workspace = self.create_snt_workspace(name="Second workspace")

        donor = Donor.objects.create(account=self.account, workspace=second_workspace, name="Global Fund")

        self.assertEqual(donor.workspace, second_workspace)

    def test_account_without_workspace_gets_one_named_after_it(self):
        account = Account.objects.create(name="Account without workspace")

        budget_settings = BudgetSettings.objects.create(
            account=account, local_currency="XOF", exchange_rate="600", inflation_rate="0.03"
        )

        self.assertEqual(budget_settings.workspace, Workspace.objects.get(account=account))
        self.assertEqual(budget_settings.workspace.name, "Account without workspace")
