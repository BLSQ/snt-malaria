from django.core.management import call_command

from plugins.snt_malaria.management.commands.support.intervention_seeder import InterventionSeeder
from plugins.snt_malaria.models import BudgetSettings, CostUnitType, InterventionCategory
from plugins.snt_malaria.tests.common_base import SNTMalariaTestCase


class InterventionSeederTestCase(SNTMalariaTestCase):
    def test_seeds_catalogue_and_budget_settings_into_the_given_workspace_only(self):
        other_workspace = self.create_snt_workspace(name="Other workspace")

        InterventionSeeder(other_workspace, stdout_writer=lambda _: None).create_interventions()

        self.assertTrue(InterventionCategory.objects.filter(workspace=other_workspace).exists())
        self.assertTrue(CostUnitType.objects.filter(workspace=other_workspace).exists())
        self.assertTrue(BudgetSettings.objects.filter(workspace=other_workspace).exists())
        self.assertFalse(InterventionCategory.objects.filter(workspace=self.workspace).exists())
        self.assertFalse(CostUnitType.objects.filter(workspace=self.workspace).exists())


class SeedInterventionsCommandTestCase(SNTMalariaTestCase):
    def test_workspace_id_limits_seeding_to_that_workspace(self):
        other_account, _ = self.create_snt_account(name="Other account")
        other_workspace = other_account.workspaces.get()

        call_command("seed_interventions", "--cost-units-only", "--workspace-id", str(other_workspace.id), stdout=None)

        self.assertTrue(CostUnitType.objects.filter(workspace=other_workspace).exists())
        self.assertFalse(CostUnitType.objects.filter(workspace=self.workspace).exists())

    def test_without_workspace_id_seeds_every_workspace(self):
        other_account, _ = self.create_snt_account(name="Other account")

        call_command("seed_interventions", "--cost-units-only", stdout=None)

        seeded_workspace_ids = set(CostUnitType.objects.values_list("workspace_id", flat=True))
        self.assertEqual(seeded_workspace_ids, {self.workspace.id, other_account.workspaces.get().id})
