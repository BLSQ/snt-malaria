from django.core.management.base import BaseCommand

from iaso.models import Workspace

from .support.intervention_seeder import InterventionSeeder


class Command(BaseCommand):
    help = "Populate the database with cost unit types, intervention categories and interventions"

    def add_arguments(self, parser):
        parser.add_argument(
            "--cost-units-only",
            action="store_true",
            help="Only seed/update the default cost unit types and migrate legacy ones, without touching interventions",
        )
        parser.add_argument(
            "--workspace-id",
            type=int,
            help="Seed only this workspace (default: every workspace)",
        )

    def handle(self, *args, **options):
        workspaces = Workspace.objects.select_related("account").order_by("id")
        if options["workspace_id"]:
            workspaces = workspaces.filter(id=options["workspace_id"])
        for workspace in workspaces:
            seeder = InterventionSeeder(workspace, self.stdout.write)
            if options["cost_units_only"]:
                seeder.seed_cost_unit_types()
            else:
                seeder.create_interventions()
