from django.core.management.base import BaseCommand

from iaso.models import Account

from .support.intervention_seeder import InterventionSeeder


class Command(BaseCommand):
    help = "Populate the database with intervention categories and interventions"

    def handle(self, *args, **options):
        for account in Account.objects.all():
            InterventionSeeder(account, self.stdout.write).create_interventions()
