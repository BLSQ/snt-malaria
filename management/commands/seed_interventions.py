from django.core.management.base import BaseCommand

from iaso.models import Account, User
from plugins.snt_malaria.models.intervention import InterventionCategory, Intervention


class Command(BaseCommand):
    help = "Populate the database with intervention categories and interventions"

    def handle(self, *args, **options):
        print("Clearing existing interventions and categories")
        Intervention.objects.all().delete()
        InterventionCategory.objects.all().delete()

        categories_and_interventions = {
            "Vaccination": {
                "interventions": [
                    {
                        "name": "RTS,S",
                        "description": "RTS,S malaria vaccine",
                    },
                ],
            },
            "Preventive Chemotherapy": {
                "interventions": [
                    {"name": "SMC", "description": "Seasonal Malaria Chemoprevention"},
                    {"name": "PMC", "description": "Perennial Malaria Chemoprevention"},
                    {"name": "IPTp", "description": "Intermittent Preventive Treatment in Pregnancy"},
                ]
            },
            "Vector Control": {
                "interventions": [
                    {"name": "LLIN", "description": "Long-Lasting Insecticidal Nets"},
                    {"name": "IRS", "description": "Indoor Residual Spraying"},
                ]
            },
            "Mass Drug Administration": {
                "interventions": [
                    {"name": "MDA", "description": "Mass Drug Administration"},
                ],
            },
            "Case Management": {
                "interventions": [
                    {"name": "RDTs", "description": "Rapid Diagnostic Tests"},
                    {"name": "ACTs", "description": "Artemisin-based Combination Therapy"},
                ]
            },
        }

        account = Account.objects.first()
        created_by = User.objects.first()

        for category_name, data in categories_and_interventions.items():
            category, created = InterventionCategory.objects.get_or_create(
                name=category_name,
                defaults={
                    # "description": data["description"],
                    "account": account,
                    "created_by": created_by,
                },
            )
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f"Created category: {category_name}")
                )

            for intervention_data in data["interventions"]:
                intervention, created = Intervention.objects.get_or_create(
                    name=intervention_data["name"],
                    intervention_category=category,
                    defaults={
                        "description": intervention_data["description"],
                        "created_by": created_by,
                    },
                )
                if created:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"\tCreated intervention: {intervention_data['name']}"
                        )
                    )
