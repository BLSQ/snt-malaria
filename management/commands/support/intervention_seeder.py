"""
Create interventions for a given account
"""

from iaso.models import User
from plugins.snt_malaria.models.intervention import Intervention, InterventionCategory


("itn_campaign",)
("itn_routine",)
("lsm",)
CATEGORIES_AND_INTERVENTIONS = {
    "Vaccination": {
        "interventions": [
            {"name": "RTS,S", "description": "RTS,S malaria vaccine", "code": "vacc"},
        ],
    },
    "Preventive Chemotherapy": {
        "interventions": [
            {"name": "SMC", "description": "Seasonal Malaria Chemoprevention", "code": "smc"},
            {"name": "PMC", "description": "Perennial Malaria Chemoprevention", "code": "pmc"},
            {"name": "IPTp", "description": "Intermittent Preventive Treatment in Pregnancy", "code": "iptp"},
        ]
    },
    "Vector Control": {
        "interventions": [
            {"name": "LLIN Routine", "description": "Long-Lasting Insecticidal Nets - Routine", "code": "itn_routine"},
            {
                "name": "LLIN Campaign",
                "description": "Long-Lasting Insecticidal Nets - Campaign",
                "code": "itn_campaign",
            },
            {"name": "IRS", "description": "Indoor Residual Spraying", "code": "irs"},
            {"name": "LSM", "description": "Larval Source Management", "code": "lsm"},
        ]
    },
    "Mass Drug Administration": {
        "interventions": [
            {"name": "MDA", "description": "Mass Drug Administration", "code": ""},
        ],
    },
    "Case Management": {
        "interventions": [
            {"name": "CM", "description": "Case Management", "code": "cm"},
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
                    code=intervention_data["code"],
                    defaults={
                        "description": intervention_data["description"],
                        "created_by": created_by,
                    },
                )
                if created:
                    self.stdout_write(f"\tCreated intervention: {intervention_data['name']}")

        self.stdout_write("Done.")
