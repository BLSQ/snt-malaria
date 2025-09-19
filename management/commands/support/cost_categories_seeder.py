"""
Create interventions for a given account
"""

from iaso.models import User
from plugins.snt_malaria.models.cost_breakdown import CostBreakdownLineCategory


COST_CATEGORIES = [
    "Procurement",
    "Support",
    "Implementation",
]


class CostCategoriesSeeder:
    def __init__(self, account, stdout_writer=None):
        self.account = account
        self.stdout_write = stdout_writer or print

    def create_cost_categories(self):
        if CostBreakdownLineCategory.objects.filter(account=self.account).exists():
            self.stdout_write(f"Skipping account {self.account.name}, already has cost categories")
            return

        self.stdout_write(f"Creating cost categories for account {self.account.name}:")
        created_by = User.objects.filter(iaso_profile__account=self.account).first()

        for category_name in COST_CATEGORIES:
            category, created = CostBreakdownLineCategory.objects.get_or_create(
                name=category_name,
                account=self.account,
                defaults={
                    "created_by": created_by,
                },
            )
            if created:
                self.stdout_write(f"Created category: {category_name}")
        self.stdout_write("Done.")
