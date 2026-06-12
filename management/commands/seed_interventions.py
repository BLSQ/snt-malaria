from django.core.management.base import BaseCommand

from iaso.models import Account

from .support.intervention_seeder import InterventionSeeder


class Command(BaseCommand):
    help = "Populate the database with cost unit types, intervention categories and interventions"

    def add_arguments(self, parser):
        parser.add_argument(
            "--cost-units-only",
            action="store_true",
            help="Only seed/update the default cost unit types and migrate legacy ones, without touching interventions",
        )

    def handle(self, *args, **options):
        for account in Account.objects.all():
            seeder = InterventionSeeder(account, self.stdout.write)
            if options["cost_units_only"]:
                seeder.seed_cost_unit_types()
            else:
                seeder.create_interventions()
