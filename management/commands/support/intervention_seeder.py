"""
Create interventions for a given account
"""

from iaso.models import User
from plugins.snt_malaria.models.intervention import Intervention, InterventionCategory


CATEGORIES_AND_INTERVENTIONS = {
    "Vaccination": {
        "interventions": [
            {"name": "RTS,S", "description": "RTS,S malaria vaccine"},
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


class InterventionSeeder:
    def __init__(self, account, stdout_writer=None):
        self.account = account
        self.stdout_write = stdout_writer or print

    def create_interventions(self):
        if InterventionCategory.objects.filter(account=self.account).exists():
            self.stdout_write(f"Skipping account {self.account.name}, already has interventions")
            return

        self.stdout_write(f"Creating interventions for account {self.account.name}:")
        created_by = User.objects.filter(iaso_profile__account=self.account).first()

        for category_name, data in CATEGORIES_AND_INTERVENTIONS.items():
            category, created = InterventionCategory.objects.get_or_create(
                name=category_name,
                account=self.account,
                defaults={
                    # "description": data["description"],
                    "created_by": created_by,
                },
            )
            if created:
                self.stdout_write(f"Created category: {category_name}")

            for intervention_data in data["interventions"]:
                _intervention, created = Intervention.objects.get_or_create(
                    name=intervention_data["name"],
                    intervention_category=category,
                    defaults={
                        "description": intervention_data["description"],
                        "created_by": created_by,
                    },
                )
                if created:
                    self.stdout_write(f"\tCreated intervention: {intervention_data['name']}")

        self.stdout_write("Done.")
