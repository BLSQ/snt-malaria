from django.core.management.base import BaseCommand

from iaso.models import Account, User
from plugins.snt_malaria.models.intervention import Intervention, InterventionCategory


class Command(BaseCommand):
    help = "Populate the database with Nigerian intervention categories and interventions based on IDM dashboard data"

    def add_arguments(self, parser):
        parser.add_argument("--account_id", type=int, required=True, help="Account ID for Nigerian interventions")
        parser.add_argument(
            "--clear-existing", action="store_true", help="Clear existing interventions for this account before seeding"
        )

    def handle(self, *args, **options):
        account_id = options["account_id"]
        clear_existing = options["clear_existing"]

        try:
            account = Account.objects.get(id=account_id)
        except Account.DoesNotExist:
            self.stderr.write(f"Account with ID {account_id} does not exist")
            return

        # Get a user for this account
        created_by = User.objects.filter(iaso_profile__account=account).first()
        if not created_by:
            self.stderr.write(f"No users found for account {account.name}")
            return

        if clear_existing:
            self.stdout.write("Clearing existing interventions and categories for this account")
            Intervention.objects.filter(intervention_category__account=account).delete()
            InterventionCategory.objects.filter(account=account).delete()

        # Nigerian intervention data based on IDM dashboard
        # Costs are averaged from 2033 data across all Nigerian LGAs
        categories_and_interventions = {
            "Case Management": {
                "description": "Case management interventions for malaria treatment",
                "interventions": [
                    {
                        "name": "CM",
                        "description": "Case Management",
                        "cost_per_unit": 1.90,  # Average cost from intervention_cost table
                    },
                ],
            },
            "Vector Control": {
                "description": "Vector control interventions including nets and spraying",
                "interventions": [
                    {
                        "name": "PYR",
                        "description": "Mass distribution of pyrethroid-only ITNs every 3 years (according to current schedule)",
                        "cost_per_unit": 0.24,  # Average ITN cost from intervention_cost table
                    },
                    {
                        "name": "IG2 ITNs",
                        "description": "Mass distribution of IG2 ITNs every 3 years (according to current schedule)",
                        "cost_per_unit": 0.24,  # Average ITN cost from intervention_cost table
                    },
                ],
            },
            "IRS": {
                "description": "IRS",
                "interventions": [
                    {
                        "name": "IRS Once",
                        "description": "Indoor Residual Spraying - Once per year",
                        "cost_per_unit": 1.20,  # Average IRS cost from intervention_cost table
                    },
                    {
                        "name": "IRS Twice",
                        "description": "Indoor Residual Spraying - Twice per year",
                        "cost_per_unit": 1.20,  # Average IRS cost from intervention_cost table
                    },
                ],
            },
            "Preventive Chemotherapy": {
                "description": "Preventive chemotherapy interventions",
                "interventions": [
                    {
                        "name": "SMC",
                        "description": "Seasonal Malaria Chemoprevention",
                        "cost_per_unit": 0.69,  # Average SMC cost from intervention_cost table
                    },
                    {
                        "name": "PMC",
                        "description": "Perennial Malaria Chemoprevention",
                        "cost_per_unit": 0.69,  # Average SMC cost from intervention_cost table (same as SMC)
                    },
                ],
            },
            "Vaccination": {
                "description": "Malaria vaccination interventions",
                "interventions": [
                    {
                        "name": "RTS,S",
                        "description": "RTS,S like vaccine given through EPI with one booster",
                        "cost_per_unit": 0.09,  # Average vaccine cost from intervention_cost table
                    },
                ],
            },
        }

        self.stdout.write(f"Seeding interventions for account: {account.name}")
        self.stdout.write("-" * 60)

        for category_name, category_data in categories_and_interventions.items():
            # Create or get the intervention category
            category, created = InterventionCategory.objects.get_or_create(
                name=category_name,
                account=account,
                defaults={
                    "description": category_data["description"],
                    "created_by": created_by,
                },
            )

            if created:
                self.stdout.write(self.style.SUCCESS(f"Created category: {category_name}"))
            else:
                self.stdout.write(f"Category already exists: {category_name}")

            # Create interventions for this category
            for intervention_data in category_data["interventions"]:
                intervention, created = Intervention.objects.get_or_create(
                    name=intervention_data["name"],
                    intervention_category=category,
                    defaults={
                        "description": intervention_data["description"],
                        "cost_per_unit": intervention_data["cost_per_unit"],
                        "created_by": created_by,
                    },
                )

                if created:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"\tCreated intervention: {intervention_data['name']} "
                            f"(${intervention_data['cost_per_unit']:.2f})"
                        )
                    )
                else:
                    self.stdout.write(f"\tIntervention already exists: {intervention_data['name']}")

        self.stdout.write("-" * 60)
        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully seeded {len(categories_and_interventions)} categories "
                f"with {sum(len(cat['interventions']) for cat in categories_and_interventions.values())} interventions"
            )
        )
