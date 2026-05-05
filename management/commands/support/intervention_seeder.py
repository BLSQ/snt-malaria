"""
Create interventions for a given account
"""

from iaso.models import User
from plugins.snt_malaria.models.budget_settings import BudgetSettings
from plugins.snt_malaria.models.cost_breakdown import (
    InterventionCostBreakdownLine,
    InterventionCostUnitType,
)
from plugins.snt_malaria.models.intervention import Intervention, InterventionAssignment, InterventionCategory


# Alias for brevity
CostCategory = InterventionCostBreakdownLine.InterventionCostBreakdownLineCategory

# Hard code for now to match InterventionSettings.tsx startYear

CATEGORIES_AND_INTERVENTIONS = {
    "Case Management": {
        "short_name": "CM",
        "interventions": [
            {
                "name": "CM",
                "code": "cm_public",
                "description": "",
                "allowed_cost_unit_types": [InterventionCostUnitType.OTHER.value],
                "cost_settings": [],
            },
            {
                "name": "CM Subsidy",
                "code": "cm_subsidy",
                "description": "",
                "allowed_cost_unit_types": [InterventionCostUnitType.OTHER.value],
                "cost_settings": [],
            },
            {
                "name": "iCCM",
                "code": "cm",
                "description": "",
                "allowed_cost_unit_types": [InterventionCostUnitType.OTHER.value],
                "cost_settings": [],
            },
        ],
    },
    "IPTp": {
        "interventions": [
            {
                "name": "IPTp (SP)",
                "short_name": "IPTp",
                "code": "iptp",
                "description": "",
                "allowed_cost_unit_types": [InterventionCostUnitType.PER_SP.value],
                "cost_settings": [
                    {
                        "name": "IPTp (SP) Procurement",
                        "unit_cost": "0.51",
                        "unit_type": InterventionCostUnitType.PER_SP,
                        "category": CostCategory.PROCUREMENT,
                    },
                    {
                        "name": "IPTp (SP) Distribution",
                        "unit_cost": "0.13",
                        "unit_type": InterventionCostUnitType.PER_SP,
                        "category": CostCategory.DELIVERY,
                    },
                ],
            },
        ],
    },
    "PMC & SMC": {
        "interventions": [
            {
                "name": "PMC (SP)",
                "short_name": "PMC",
                "code": "pmc",
                "description": "",
                "allowed_cost_unit_types": [InterventionCostUnitType.PER_SP.value],
                "cost_settings": [
                    {
                        "name": "PMC (SP) Procurement",
                        "unit_cost": "0.20",
                        "unit_type": InterventionCostUnitType.PER_SP,
                        "category": CostCategory.PROCUREMENT,
                    },
                    {
                        "name": "PMC (SP) Operational",
                        "unit_cost": "0.08",
                        "unit_type": InterventionCostUnitType.PER_CHILD,
                        "category": CostCategory.OPERATIONAL,
                    },
                ],
            },
            {
                "name": "SMC (SP+AQ)",
                "short_name": "SMC",
                "code": "smc",
                "description": "",
                "allowed_cost_unit_types": [
                    InterventionCostUnitType.PER_SPAQ_3_11_MONTHS.value,
                    InterventionCostUnitType.PER_SPAQ_12_59_MONTHS.value,
                ],
                "cost_settings": [
                    {
                        "id": 196,
                        "name": "SMC (SP+AQ) Procurement",
                        "unit_cost": "0.24",
                        "unit_type": InterventionCostUnitType.PER_SPAQ_3_11_MONTHS,
                        "category": CostCategory.PROCUREMENT,
                    },
                    {
                        "name": "SMC (SP+AQ) Procurement",
                        "unit_cost": "0.27",
                        "unit_type": InterventionCostUnitType.PER_SPAQ_12_59_MONTHS,
                        "category": CostCategory.PROCUREMENT,
                    },
                    {
                        "name": "SMC (SP+AQ) Operational",
                        "unit_cost": "1.33",
                        "unit_type": InterventionCostUnitType.PER_CHILD,
                        "category": CostCategory.OPERATIONAL,
                    },
                ],
            },
            {
                "name": "SMC 3",
                "short_name": "SMC 3",
                "code": "smc_3",
                "description": "",
                "allowed_cost_unit_types": [
                    InterventionCostUnitType.PER_SPAQ_3_11_MONTHS.value,
                    InterventionCostUnitType.PER_SPAQ_12_59_MONTHS.value,
                ],
                "cost_settings": [],
            },
            {
                "name": "SMC 4",
                "short_name": "SMC 4",
                "code": "smc_4",
                "description": "",
                "allowed_cost_unit_types": [
                    InterventionCostUnitType.PER_SPAQ_3_11_MONTHS.value,
                    InterventionCostUnitType.PER_SPAQ_12_59_MONTHS.value,
                ],
                "cost_settings": [],
            },
            {
                "name": "SMC 5",
                "short_name": "SMC 5",
                "code": "smc_5",
                "description": "",
                "allowed_cost_unit_types": [
                    InterventionCostUnitType.PER_SPAQ_3_11_MONTHS.value,
                    InterventionCostUnitType.PER_SPAQ_12_59_MONTHS.value,
                ],
                "cost_settings": [],
            },
        ],
    },
    "ITN Campaign": {
        "interventions": [
            {
                "name": "Dual AI",
                "short_name": "Dual AI (Campaign)",
                "code": "itn_campaign",
                "description": "",
                "allowed_cost_unit_types": [
                    InterventionCostUnitType.PER_ITN.value,
                    InterventionCostUnitType.PER_BALE.value,
                ],
                "cost_settings": [
                    {
                        "name": "Dual AI Procurement",
                        "unit_cost": "3.49",
                        "unit_type": InterventionCostUnitType.PER_ITN,
                        "category": CostCategory.PROCUREMENT,
                    },
                    {
                        "name": "Dual AI Distribution",
                        "unit_cost": "6.25",
                        "unit_type": InterventionCostUnitType.PER_BALE,
                        "category": CostCategory.DELIVERY,
                    },
                ],
            },
            {
                "name": "PBO",
                "short_name": "PBO (Campaign)",
                "code": "itn_campaign",
                "description": "",
                "allowed_cost_unit_types": [
                    InterventionCostUnitType.PER_ITN.value,
                    InterventionCostUnitType.PER_BALE.value,
                ],
                "cost_settings": [
                    {
                        "name": "PBO Procurement",
                        "unit_cost": "3.49",
                        "unit_type": InterventionCostUnitType.PER_ITN,
                        "category": CostCategory.PROCUREMENT,
                    },
                    {
                        "name": "PBO Distribution",
                        "unit_cost": "6.25",
                        "unit_type": InterventionCostUnitType.PER_BALE,
                        "category": CostCategory.DELIVERY,
                    },
                ],
            },
            {
                "name": "Standard Pyrethroid",
                "short_name": "PYR (Campaign)",
                "code": "itn_campaign",
                "description": "",
                "allowed_cost_unit_types": [
                    InterventionCostUnitType.PER_ITN.value,
                    InterventionCostUnitType.PER_BALE.value,
                ],
                "cost_settings": [
                    {
                        "name": "Standard Pyrethroid Procurement",
                        "unit_cost": "0.87",
                        "unit_type": InterventionCostUnitType.PER_ITN,
                        "category": CostCategory.PROCUREMENT,
                    },
                    {
                        "name": "Standard Pyrethroid Distribution",
                        "unit_cost": "6.25",
                        "unit_type": InterventionCostUnitType.PER_BALE,
                        "category": CostCategory.DELIVERY,
                    },
                ],
            },
        ],
    },
    "ITN Routine": {
        "interventions": [
            {
                "name": "Dual AI",
                "short_name": "Dual AI (Routine)",
                "code": "itn_routine",
                "description": "",
                "allowed_cost_unit_types": [
                    InterventionCostUnitType.PER_ITN.value,
                ],
                "cost_settings": [
                    {
                        "name": "Dual AI Procurement",
                        "unit_cost": "3.49",
                        "unit_type": InterventionCostUnitType.PER_ITN,
                        "category": CostCategory.PROCUREMENT,
                    },
                    {
                        "name": "Dual AI Operational",
                        "unit_cost": "0.36",
                        "unit_type": InterventionCostUnitType.PER_ITN,
                        "category": CostCategory.OPERATIONAL,
                    },
                ],
            },
            {
                "name": "PBO",
                "short_name": "PBO (Routine)",
                "code": "itn_routine",
                "description": "",
                "allowed_cost_unit_types": [
                    InterventionCostUnitType.PER_ITN.value,
                ],
                "cost_settings": [
                    {
                        "name": "PBO Procurement",
                        "unit_cost": "0.87",
                        "unit_type": InterventionCostUnitType.PER_ITN,
                        "category": CostCategory.PROCUREMENT,
                    },
                    {
                        "name": "PBO Operational",
                        "unit_cost": "0.36",
                        "unit_type": InterventionCostUnitType.PER_ITN,
                        "category": CostCategory.OPERATIONAL,
                    },
                ],
            },
            {
                "name": "Standard Pyrethroid",
                "short_name": "PYR (Routine)",
                "code": "itn_routine",
                "description": "",
                "allowed_cost_unit_types": [
                    InterventionCostUnitType.PER_ITN.value,
                ],
                "cost_settings": [
                    {
                        "name": "Standard Pyrethroid Procurement",
                        "unit_cost": "3.49",
                        "unit_type": InterventionCostUnitType.PER_ITN,
                        "category": CostCategory.PROCUREMENT,
                    },
                    {
                        "name": "Standard Pyrethroid Operational",
                        "unit_cost": "0.36",
                        "unit_type": InterventionCostUnitType.PER_ITN,
                        "category": CostCategory.OPERATIONAL,
                    },
                ],
            },
        ],
    },
    "ITN School": {
        "interventions": [
            {
                "name": "Dual AI",
                "short_name": "Dual AI (School)",
                "code": "itn_campaign",
                "description": "",
                "allowed_cost_unit_types": [
                    InterventionCostUnitType.PER_ITN.value,
                    InterventionCostUnitType.PER_BALE.value,
                ],
                "cost_settings": [
                    {
                        "name": "Dual AI Procurement",
                        "unit_cost": "3.49",
                        "unit_type": InterventionCostUnitType.PER_ITN,
                        "category": CostCategory.PROCUREMENT,
                    },
                    {
                        "name": "Dual AI Distribution",
                        "unit_cost": "6.25",
                        "unit_type": InterventionCostUnitType.PER_BALE,
                        "category": CostCategory.DELIVERY,
                    },
                ],
            },
            {
                "name": "PBO",
                "short_name": "PBO (School)",
                "code": "itn_campaign",
                "description": "",
                "allowed_cost_unit_types": [
                    InterventionCostUnitType.PER_ITN.value,
                    InterventionCostUnitType.PER_BALE.value,
                ],
                "cost_settings": [
                    {
                        "name": "PBO Procurement",
                        "unit_cost": "3.49",
                        "unit_type": InterventionCostUnitType.PER_ITN,
                        "category": CostCategory.PROCUREMENT,
                    },
                    {
                        "name": "PBO Distribution",
                        "unit_cost": "6.25",
                        "unit_type": InterventionCostUnitType.PER_BALE,
                        "category": CostCategory.DELIVERY,
                    },
                ],
            },
            {
                "name": "Standard Pyrethroid",
                "short_name": "PYR (School)",
                "code": "itn_campaign",
                "description": "",
                "allowed_cost_unit_types": [
                    InterventionCostUnitType.PER_ITN.value,
                    InterventionCostUnitType.PER_BALE.value,
                ],
                "cost_settings": [
                    {
                        "name": "Standard Pyrethroid Procurement",
                        "unit_cost": "0.87",
                        "unit_type": InterventionCostUnitType.PER_ITN,
                        "category": CostCategory.PROCUREMENT,
                    },
                    {
                        "name": "Standard Pyrethroid Distribution",
                        "unit_cost": "6.25",
                        "unit_type": InterventionCostUnitType.PER_BALE,
                        "category": CostCategory.DELIVERY,
                    },
                ],
            },
        ],
    },
    "Vaccination": {
        "short_name": "Vacc",
        "interventions": [
            {
                "name": "R21",
                "code": "vacc",
                "description": "",
                "allowed_cost_unit_types": [
                    InterventionCostUnitType.PER_DOSE.value,
                    InterventionCostUnitType.PER_CHILD.value,
                ],
                "cost_settings": [
                    {
                        "name": "R21 Procurement",
                        "unit_cost": "4.00",
                        "unit_type": InterventionCostUnitType.PER_DOSE,
                        "category": CostCategory.PROCUREMENT,
                    },
                    {
                        "name": "R21 Operational",
                        "unit_cost": "1.00",
                        "unit_type": InterventionCostUnitType.PER_CHILD,
                        "category": CostCategory.OPERATIONAL,
                    },
                ],
            },
            {
                "name": "RTS,S",
                "code": "vacc",
                "description": "",
                "allowed_cost_unit_types": [
                    InterventionCostUnitType.PER_DOSE.value,
                    InterventionCostUnitType.PER_CHILD.value,
                ],
                "cost_settings": [],
            },
        ],
    },
    "Vector Control": {
        "interventions": [
            {
                "name": "LSM",
                "code": "lsm",
                "description": "",
                "allowed_cost_unit_types": [InterventionCostUnitType.OTHER.value],
                "cost_settings": [],
            }
        ],
    },
}


class InterventionSeeder:
    def __init__(self, account, stdout_writer=None):
        self.account = account
        self.stdout_write = stdout_writer or print

    def create_interventions(self):
        if InterventionCategory.objects.filter(account=self.account).exists():
            response = (
                input(
                    f"Interventions already exist for account {self.account.name}. Do you want to override them? (y/N): "
                )
                .strip()
                .lower()
            )
            if response != "y":
                self.stdout_write(f"Skipping account {self.account.name}, already has interventions")
                return
            # Delete existing interventions and categories for this account
            InterventionCostBreakdownLine.objects.filter(
                intervention__intervention_category__account=self.account
            ).delete()
            InterventionAssignment.objects.filter(intervention__intervention_category__account=self.account).delete()
            Intervention.objects.filter(intervention_category__account=self.account).delete()
            InterventionCategory.objects.filter(account=self.account).delete()
            self.stdout_write(f"Existing interventions for account {self.account.name} have been deleted.")

        self.stdout_write(f"Creating interventions for account {self.account.name}:")
        created_by = User.objects.filter(iaso_profile__account=self.account).first()
        self._create_interventions(created_by)

    def create_interventions_for_api_account(self, user):
        self._create_interventions(user, print_progress=False)

    def _create_interventions(self, user, print_progress=True):
        # Create budget settings if they don't exist
        self._create_budget_settings(print_progress)

        for category_name, data in CATEGORIES_AND_INTERVENTIONS.items():
            category, created = InterventionCategory.objects.get_or_create(
                name=category_name,
                short_name=data.get("short_name", category_name),
                account=self.account,
                defaults={
                    # "description": data["description"],
                    "created_by": user,
                },
            )
            if created and print_progress:
                self.stdout_write(f"Created category: {category_name}")

            for intervention_data in data["interventions"]:
                intervention, created = Intervention.objects.get_or_create(
                    name=intervention_data["name"],
                    short_name=intervention_data.get("short_name", intervention_data["name"]),
                    intervention_category=category,
                    code=intervention_data["code"],
                    allowed_cost_unit_types=intervention_data.get("allowed_cost_unit_types", []),
                    defaults={
                        "description": intervention_data["description"],
                        "created_by": user,
                    },
                )
                if created:
                    if print_progress:
                        self.stdout_write(f"\tCreated intervention: {intervention_data['name']}")
                    # Create cost breakdown lines for this intervention
                    cost_settings = intervention_data.get("cost_settings", [])
                    if cost_settings:
                        self._create_cost_breakdown_lines(intervention, cost_settings, user, print_progress)

        if print_progress:
            self.stdout_write("Done.")

    def _create_budget_settings(self, print_progress):
        """Create budget settings for the account if they don't exist."""
        if not BudgetSettings.objects.filter(account=self.account).exists():
            BudgetSettings.objects.create(
                account=self.account,
                local_currency="USD",  # Default to USD, can be changed per account
                exchange_rate=1.0,  # 1:1 exchange rate with USD as default
                inflation_rate=0.03,  # 3% inflation rate as default
            )
            if print_progress:
                self.stdout_write("Created budget settings")

    def _create_cost_breakdown_lines(self, intervention, cost_settings, created_by, print_progress):
        """Create cost breakdown lines for a given intervention."""
        for cost_data in cost_settings:
            InterventionCostBreakdownLine.objects.create(
                intervention=intervention,
                name=cost_data["name"],
                category=cost_data["category"],
                unit_type=cost_data["unit_type"],
                unit_cost=cost_data["unit_cost"],
                created_by=created_by,
            )
        if print_progress:
            self.stdout_write(f"\t  Created {len(cost_settings)} cost breakdown lines")
