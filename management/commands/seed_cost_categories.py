from django.core.management.base import BaseCommand

from iaso.models import Account

from .support.cost_categories_seeder import CostCategoriesSeeder


class Command(BaseCommand):
    help = "Populate the database with cost categories"

    def handle(self, *args, **options):
        for account in Account.objects.all():
            CostCategoriesSeeder(account, self.stdout.write).create_cost_categories()
