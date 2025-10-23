"""
Create interventions for a given account
"""

from datetime import date

from iaso.models import User
from plugins.snt_malaria.models.budget_settings import BudgetSettings
from plugins.snt_malaria.models.cost_breakdown import (
    InterventionCostBreakdownLine,
    InterventionCostUnitType,
)
from plugins.snt_malaria.models.intervention import Intervention, InterventionCategory


# Alias for brevity
CostCategory = InterventionCostBreakdownLine.InterventionCostBreakdownLineCategory

CURRENT_YEAR = date.today().year

CATEGORIES_AND_INTERVENTIONS = {
    "Vaccination": {
        "interventions": [
            {
                "name": "RTS,S",
                "description": "RTS,S malaria vaccine",
                "code": "vacc",
                "cost_settings": [
                    {
                        "name": "R21 vaccine procurement",
                        "category": CostCategory.PROCUREMENT,
                        "unit_type": InterventionCostUnitType.PER_DOSE,
                        "unit_cost": 9.3,
                        "year": CURRENT_YEAR,
                    },
                    {
                        "name": "R21 operational costs",
                        "category": CostCategory.OPERATIONAL,
                        "unit_type": InterventionCostUnitType.PER_CHILD,
                        "unit_cost": 8.5,
                        "year": CURRENT_YEAR,
                    },
                ],
            },
        ],
    },
    "Preventive Chemotherapy": {
        "interventions": [
            {
                "name": "SMC",
                "description": "Seasonal Malaria Chemoprevention",
                "code": "smc",
                "cost_settings": [
                    {
                        "name": "SP+AQ procurement (3-11 month olds)",
                        "category": CostCategory.PROCUREMENT,
                        "unit_type": InterventionCostUnitType.PER_SPAQ_3_11_MONTHS,
                        "unit_cost": 0.2,
                        "year": CURRENT_YEAR,
                    },
                    {
                        "name": "SP+AQ procurement (12-59 month olds)",
                        "category": CostCategory.PROCUREMENT,
                        "unit_type": InterventionCostUnitType.PER_SPAQ_12_59_MONTHS,
                        "unit_cost": 0.2,
                        "year": CURRENT_YEAR,
                    },
                    {
                        "name": "Campaign operational costs",
                        "category": CostCategory.OPERATIONAL,
                        "unit_type": InterventionCostUnitType.PER_CHILD,
                        "unit_cost": 5,
                        "year": CURRENT_YEAR,
                    },
                ],
            },
            {
                "name": "PMC",
                "description": "Perennial Malaria Chemoprevention",
                "code": "pmc",
                "cost_settings": [
                    {
                        "name": "SP procurement",
                        "category": CostCategory.PROCUREMENT,
                        "unit_type": InterventionCostUnitType.PER_SP,
                        "unit_cost": 0.3,
                        "year": CURRENT_YEAR,
                    },
                    {
                        "name": "PMC operational costs",
                        "category": CostCategory.OPERATIONAL,
                        "unit_type": InterventionCostUnitType.PER_CHILD,
                        "unit_cost": 3,
                        "year": CURRENT_YEAR,
                    },
                ],
            },
            {
                "name": "IPTp",
                "description": "Intermittent Preventive Treatment in Pregnancy",
                "code": "iptp",
                "cost_settings": [
                    {
                        "name": "SP procurement",
                        "category": CostCategory.PROCUREMENT,
                        "unit_type": InterventionCostUnitType.PER_SP,
                        "unit_cost": 0.4,
                        "year": CURRENT_YEAR,
                    },
                    {
                        "name": "SP distribution",
                        "category": CostCategory.DELIVERY,
                        "unit_type": InterventionCostUnitType.PER_SP,
                        "unit_cost": 0.3,
                        "year": CURRENT_YEAR,
                    },
                ],
            },
        ]
    },
    "Vector Control": {
        "interventions": [
            {
                "name": "LLIN Routine",
                "description": "Long-Lasting Insecticidal Nets - Routine",
                "code": "itn_routine",
                "cost_settings": [
                    {
                        "name": "Dual AI nets procurement",
                        "category": CostCategory.PROCUREMENT,
                        "unit_type": InterventionCostUnitType.PER_ITN,
                        "unit_cost": 3.5,
                        "year": CURRENT_YEAR,
                    },
                    {
                        "name": "PBO nets procurement",
                        "category": CostCategory.PROCUREMENT,
                        "unit_type": InterventionCostUnitType.PER_ITN,
                        "unit_cost": 2.8,
                        "year": CURRENT_YEAR,
                    },
                    {
                        "name": "Standard Pyrethroid procurement",
                        "category": CostCategory.PROCUREMENT,
                        "unit_type": InterventionCostUnitType.PER_ITN,
                        "unit_cost": 2.2,
                        "year": CURRENT_YEAR,
                    },
                    {
                        "name": "Routine distribution operational costs",
                        "category": CostCategory.OPERATIONAL,
                        "unit_type": InterventionCostUnitType.PER_ITN,
                        "unit_cost": 0.8,
                        "year": CURRENT_YEAR,
                    },
                ],
            },
            {
                "name": "LLIN Campaign",
                "description": "Long-Lasting Insecticidal Nets - Campaign",
                "code": "itn_campaign",
                "cost_settings": [
                    {
                        "name": "GF procurement cost",
                        "category": CostCategory.PROCUREMENT,
                        "unit_type": InterventionCostUnitType.PER_ITN,
                        "unit_cost": 2.5,
                        "year": CURRENT_YEAR,
                    },
                    {
                        "name": "PBO nets procurement",
                        "category": CostCategory.PROCUREMENT,
                        "unit_type": InterventionCostUnitType.PER_ITN,
                        "unit_cost": 2.0,
                        "year": CURRENT_YEAR,
                    },
                    {
                        "name": "Standard Pyrethroid procurement",
                        "category": CostCategory.PROCUREMENT,
                        "unit_type": InterventionCostUnitType.PER_ITN,
                        "unit_cost": 2.2,
                        "year": CURRENT_YEAR,
                    },
                    {
                        "name": "Moving net from central to regional hubs",
                        "category": CostCategory.DELIVERY,
                        "unit_type": InterventionCostUnitType.PER_BALE,
                        "unit_cost": 1.5,
                        "year": CURRENT_YEAR,
                    },
                    {
                        "name": "Campaign costs",
                        "category": CostCategory.OPERATIONAL,
                        "unit_type": InterventionCostUnitType.PER_ITN,
                        "unit_cost": 0.6,
                        "year": CURRENT_YEAR,
                    },
                    {
                        "name": "Net Storage at GF warehouse per year",
                        "category": CostCategory.SUPPORTIVE,
                        "unit_type": InterventionCostUnitType.OTHER,
                        "unit_cost": 5000,
                        "year": CURRENT_YEAR,
                    },
                ],
            },
            {
                "name": "IRS",
                "description": "Indoor Residual Spraying",
                "code": "irs",
                "cost_settings": [
                    {
                        "name": "Actellic 300CS operational costs",
                        "category": CostCategory.OPERATIONAL,
                        "unit_type": InterventionCostUnitType.OTHER,
                        "unit_cost": 8.5,
                        "year": CURRENT_YEAR,
                    },
                ],
            },
            {
                "name": "LSM",
                "description": "Larval Source Management",
                "code": "lsm",
                "cost_settings": [
                    {
                        "name": "LSM procurement",
                        "category": CostCategory.PROCUREMENT,
                        "unit_type": InterventionCostUnitType.OTHER,
                        "unit_cost": 2.5,
                        "year": CURRENT_YEAR,
                    },
                    {
                        "name": "LSM operational costs",
                        "category": CostCategory.OPERATIONAL,
                        "unit_type": InterventionCostUnitType.OTHER,
                        "unit_cost": 3.2,
                        "year": CURRENT_YEAR,
                    },
                ],
            },
        ]
    },
    "Mass Drug Administration": {
        "interventions": [
            {
                "name": "MDA",
                "description": "Mass Drug Administration",
                "code": "mda",
                "cost_settings": [
                    {
                        "name": "MDA drug procurement",
                        "category": CostCategory.PROCUREMENT,
                        "unit_type": InterventionCostUnitType.OTHER,
                        "unit_cost": 0.75,
                        "year": CURRENT_YEAR,
                    },
                    {
                        "name": "MDA campaign costs",
                        "category": CostCategory.OPERATIONAL,
                        "unit_type": InterventionCostUnitType.OTHER,
                        "unit_cost": 2.5,
                        "year": CURRENT_YEAR,
                    },
                ],
            },
        ],
    },
    "Case Management": {
        "interventions": [
            {
                "name": "RDTs",
                "description": "Rapid Diagnostic Tests",
                "code": "cm",
                "cost_settings": [
                    {
                        "name": "RDT kits procurement",
                        "category": CostCategory.PROCUREMENT,
                        "unit_type": InterventionCostUnitType.PER_RDT_KIT,
                        "unit_cost": 0.75,
                        "year": CURRENT_YEAR,
                    },
                    {
                        "name": "RDT kits distribution",
                        "category": CostCategory.DELIVERY,
                        "unit_type": InterventionCostUnitType.PER_RDT_KIT,
                        "unit_cost": 0.2,
                        "year": CURRENT_YEAR,
                    },
                ],
            },
            {
                "name": "ACTs",
                "description": "Artemisin-based Combination Therapy",
                "code": "cm",
                "cost_settings": [
                    {
                        "name": "AL procurement",
                        "category": CostCategory.PROCUREMENT,
                        "unit_type": InterventionCostUnitType.PER_AL,
                        "unit_cost": 1.2,
                        "year": CURRENT_YEAR,
                    },
                    {
                        "name": "AL distribution",
                        "category": CostCategory.DELIVERY,
                        "unit_type": InterventionCostUnitType.PER_AL,
                        "unit_cost": 0.3,
                        "year": CURRENT_YEAR,
                    },
                    {
                        "name": "Artesunate injections procurement",
                        "category": CostCategory.PROCUREMENT,
                        "unit_type": InterventionCostUnitType.PER_60MG_POWDER,
                        "unit_cost": 4.5,
                        "year": CURRENT_YEAR,
                    },
                    {
                        "name": "Artesunate injections distribution",
                        "category": CostCategory.DELIVERY,
                        "unit_type": InterventionCostUnitType.PER_60MG_POWDER,
                        "unit_cost": 1.0,
                        "year": CURRENT_YEAR,
                    },
                    {
                        "name": "RAS procurement",
                        "category": CostCategory.PROCUREMENT,
                        "unit_type": InterventionCostUnitType.PER_RAS,
                        "unit_cost": 2.8,
                        "year": CURRENT_YEAR,
                    },
                    {
                        "name": "RAS distribution",
                        "category": CostCategory.DELIVERY,
                        "unit_type": InterventionCostUnitType.PER_RAS,
                        "unit_cost": 0.6,
                        "year": CURRENT_YEAR,
                    },
                    {
                        "name": "Fixed operational costs",
                        "category": CostCategory.OPERATIONAL,
                        "unit_type": InterventionCostUnitType.OTHER,
                        "unit_cost": 10000,
                        "year": CURRENT_YEAR,
                    },
                ],
            },
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

        # Create budget settings if they don't exist
        self._create_budget_settings()

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
                intervention, created = Intervention.objects.get_or_create(
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
                    # Create cost breakdown lines for this intervention
                    cost_settings = intervention_data.get("cost_settings", [])
                    if cost_settings:
                        self._create_cost_breakdown_lines(intervention, cost_settings, created_by)

        self.stdout_write("Done.")

    def _create_budget_settings(self):
        """Create budget settings for the account if they don't exist."""
        if not BudgetSettings.objects.filter(account=self.account).exists():
            BudgetSettings.objects.create(
                account=self.account,
                local_currency="USD",  # Default to USD, can be changed per account
                exchange_rate=1.0,  # 1:1 exchange rate with USD as default
                inflation_rate=0.03,  # 3% inflation rate as default
            )
            self.stdout_write("Created budget settings")

    def _create_cost_breakdown_lines(self, intervention, cost_settings, created_by):
        """Create cost breakdown lines for a given intervention."""
        for cost_data in cost_settings:
            InterventionCostBreakdownLine.objects.create(
                intervention=intervention,
                name=cost_data["name"],
                category=cost_data["category"],
                unit_type=cost_data["unit_type"],
                unit_cost=cost_data["unit_cost"],
                year=cost_data["year"],
                created_by=created_by,
            )
        self.stdout_write(f"\t  Created {len(cost_settings)} cost breakdown lines")
