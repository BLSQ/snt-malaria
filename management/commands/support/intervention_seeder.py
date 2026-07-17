"""
Create cost unit types and interventions for a given account
"""

from decimal import Decimal

from iaso.models import MetricType, User
from plugins.snt_malaria.models.budget_settings import BudgetSettings
from plugins.snt_malaria.models.cost_breakdown import InterventionCostBreakdownLine
from plugins.snt_malaria.models.cost_unit_type import CostUnitType
from plugins.snt_malaria.models.intervention import Intervention, InterventionAssignment, InterventionCategory


# Alias for brevity
CostCategory = InterventionCostBreakdownLine.InterventionCostBreakdownLineCategory

# Default cost unit types seeded for every account. Units are pure labels; the
# conversion configuration lives on the cost breakdown lines, so descriptions
# only say what the unit is.
COST_UNIT_TYPES = [
    {
        "name": "Net",
        "description": "A single insecticide-treated bed net",
        "is_commodity": True,
    },
    {
        "name": "Bale",
        "description": "A bale contains 50 nets",
        "is_commodity": True,
    },
    {
        "name": "IPTp Blister Pack",
        "description": "A single standard dose consists of a blister pack of 3 SP pills",
        "is_commodity": True,
    },
    {
        "name": "SMC Blister Pack",
        "description": "A single monthly cycle course contains 1 SP and 3 AQ tablets",
        "is_commodity": True,
    },
    {
        "name": "SP Tablet",
        "description": "A single tablet of sulfadoxine-pyrimethamine (SP)",
        "is_commodity": True,
    },
    {
        "name": "Vaccine dose",
        "description": "A single dose of malaria vaccine",
        "is_commodity": True,
    },
    {
        "name": "Day",
        "description": "A single day",
        "is_commodity": False,
    },
    {
        "name": "Item",
        "description": "Default unit for items counted individually",
        "is_commodity": False,
    },
]

# Legacy unit names -> new default unit names. Covers the enum-label rows
# created by the enum->model conversion in migration
# 0041_costunittype_and_costbreakdown_updates (one CostUnitType per account per
# legacy InterventionCostUnitType key, named with the enum label), plus the
# per-variant units that became obsolete once the conversion factor moved onto
# the cost lines (also consolidated by migration 0055_move_conversion_to_cost_lines).
LEGACY_UNIT_MAPPING = {
    "per ITN": "Net",
    "per bale": "Bale",
    "per SP": "IPTp Blister Pack",
    "per SPAQ pack 3-11 month olds": "SP Tablet",
    "per SPAQ pack 12-59 month olds": "SP Tablet",
    "per child": "Item",
    "per dose": "Vaccine dose",
    "SMC 3 cycles": "SMC Blister Pack",
    "SMC 4 cycles": "SMC Blister Pack",
    "SMC 5 cycles": "SMC Blister Pack",
    "SP+AQ pack": "SMC Blister Pack",
    "SP Tablet 0-1": "SP Tablet",
    "SP Tablet 1-2": "SP Tablet",
    "Days": "Day",
    "Each": "Item",
}

# Legacy labels without a sensible counterpart in the new units. "Other" in
# particular must not be auto-mapped: migration 0041 dumped every unknown
# legacy key into it, so its lines could be anything. These are only reported
# so they can be handled manually.
UNMAPPED_LEGACY_UNIT_NAMES = [
    "per SPAQ pack 5-10 years olds",
    "per RDT kit",
    "per AL",
    "per 60mg powder",
    "per RAS",
    "Other",
]

# Hard code for now to match InterventionSettings.tsx startYear

CATEGORIES_AND_INTERVENTIONS = {
    "Case Management": {
        "short_name": "CM",
        "interventions": [
            {
                "name": "CM",
                "code": "cm_public",
                "description": "",
                "cost_settings": [],
            },
            {
                "name": "CM Subsidy",
                "code": "cm_subsidy",
                "description": "",
                "cost_settings": [],
            },
            {
                "name": "iCCM",
                "code": "cm",
                "description": "",
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
                "cost_settings": [
                    {
                        "name": "IPTp (SP) Procurement",
                        "unit_cost": "0.51",
                        "unit_type": "IPTp Blister Pack",
                        "category": CostCategory.PROCUREMENT,
                        "population_layer_code": None,
                        "is_proportional": True,
                        "conversion_factor": Decimal("3"),
                    },
                    {
                        "name": "IPTp (SP) Distribution",
                        "unit_cost": "0.13",
                        "unit_type": "IPTp Blister Pack",
                        "category": CostCategory.DELIVERY,
                        "population_layer_code": None,
                        "is_proportional": True,
                        "conversion_factor": Decimal("3"),
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
                "cost_settings": [
                    {
                        "name": "PMC (SP) Procurement 0-1y",
                        "unit_cost": "0.20",
                        "unit_type": "SP Tablet",
                        "category": CostCategory.PROCUREMENT,
                        "population_layer_code": None,
                        "is_proportional": True,
                        "conversion_factor": Decimal("0.75"),
                    },
                    {
                        "name": "PMC (SP) Procurement 1-2y",
                        "unit_cost": "0.20",
                        "unit_type": "SP Tablet",
                        "category": CostCategory.PROCUREMENT,
                        "population_layer_code": None,
                        "is_proportional": True,
                        "conversion_factor": Decimal("1.5"),
                    },
                    {
                        "name": "PMC (SP) Operational",
                        "unit_cost": "0.08",
                        "unit_type": "Item",
                        "category": CostCategory.OPERATIONAL,
                        "population_layer_code": None,
                    },
                ],
            },
            {
                "name": "SMC (SP+AQ)",
                "short_name": "SMC",
                "code": "smc",
                "description": "",
                "cost_settings": [
                    {
                        "name": "SMC (SP+AQ) Procurement 0-1y",
                        "unit_cost": "0.24",
                        "unit_type": "SP Tablet",
                        "category": CostCategory.PROCUREMENT,
                        "population_layer_code": None,
                        "is_proportional": True,
                        "conversion_factor": Decimal("0.75"),
                    },
                    {
                        "name": "SMC (SP+AQ) Procurement 1-2y",
                        "unit_cost": "0.27",
                        "unit_type": "SP Tablet",
                        "category": CostCategory.PROCUREMENT,
                        "population_layer_code": None,
                        "is_proportional": True,
                        "conversion_factor": Decimal("1.5"),
                    },
                    {
                        "name": "SMC (SP+AQ) Operational",
                        "unit_cost": "1.33",
                        "unit_type": "Item",
                        "category": CostCategory.OPERATIONAL,
                        "population_layer_code": None,
                    },
                ],
            },
            {
                "name": "SMC 3",
                "short_name": "SMC 3",
                "code": "smc_3",
                "description": "",
                "cost_settings": [],
            },
            {
                "name": "SMC 4",
                "short_name": "SMC 4",
                "code": "smc_4",
                "description": "",
                "cost_settings": [],
            },
            {
                "name": "SMC 5",
                "short_name": "SMC 5",
                "code": "smc_5",
                "description": "",
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
                "cost_settings": [
                    {
                        "name": "Dual AI Procurement",
                        "unit_cost": "3.49",
                        "unit_type": "Net",
                        "category": CostCategory.PROCUREMENT,
                        "population_layer_code": None,
                        "is_proportional": True,
                        "conversion_factor": Decimal("1.8"),
                        "invert_conversion_factor": True,
                    },
                    {
                        "name": "Dual AI Distribution",
                        "unit_cost": "6.25",
                        "unit_type": "Bale",
                        "category": CostCategory.DELIVERY,
                        "population_layer_code": None,
                        "is_proportional": True,
                        "conversion_factor": Decimal("90"),
                        "invert_conversion_factor": True,
                    },
                ],
            },
            {
                "name": "PBO",
                "short_name": "PBO (Campaign)",
                "code": "itn_campaign",
                "description": "",
                "cost_settings": [
                    {
                        "name": "PBO Procurement",
                        "unit_cost": "3.49",
                        "unit_type": "Net",
                        "category": CostCategory.PROCUREMENT,
                        "population_layer_code": None,
                        "is_proportional": True,
                        "conversion_factor": Decimal("1.8"),
                        "invert_conversion_factor": True,
                    },
                    {
                        "name": "PBO Distribution",
                        "unit_cost": "6.25",
                        "unit_type": "Bale",
                        "category": CostCategory.DELIVERY,
                        "population_layer_code": None,
                        "is_proportional": True,
                        "conversion_factor": Decimal("90"),
                        "invert_conversion_factor": True,
                    },
                ],
            },
            {
                "name": "Standard Pyrethroid",
                "short_name": "PYR (Campaign)",
                "code": "itn_campaign",
                "description": "",
                "cost_settings": [
                    {
                        "name": "Standard Pyrethroid Procurement",
                        "unit_cost": "0.87",
                        "unit_type": "Net",
                        "category": CostCategory.PROCUREMENT,
                        "population_layer_code": None,
                        "is_proportional": True,
                        "conversion_factor": Decimal("1.8"),
                        "invert_conversion_factor": True,
                    },
                    {
                        "name": "Standard Pyrethroid Distribution",
                        "unit_cost": "6.25",
                        "unit_type": "Bale",
                        "category": CostCategory.DELIVERY,
                        "population_layer_code": None,
                        "is_proportional": True,
                        "conversion_factor": Decimal("90"),
                        "invert_conversion_factor": True,
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
                "cost_settings": [
                    {
                        "name": "Dual AI Procurement",
                        "unit_cost": "3.49",
                        "unit_type": "Net",
                        "category": CostCategory.PROCUREMENT,
                        "population_layer_code": None,
                        "is_proportional": True,
                        "conversion_factor": Decimal("1.8"),
                        "invert_conversion_factor": True,
                    },
                    {
                        "name": "Dual AI Operational",
                        "unit_cost": "0.36",
                        "unit_type": "Net",
                        "category": CostCategory.OPERATIONAL,
                        "population_layer_code": None,
                        "is_proportional": True,
                        "conversion_factor": Decimal("1.8"),
                        "invert_conversion_factor": True,
                    },
                ],
            },
            {
                "name": "PBO",
                "short_name": "PBO (Routine)",
                "code": "itn_routine",
                "description": "",
                "cost_settings": [
                    {
                        "name": "PBO Procurement",
                        "unit_cost": "0.87",
                        "unit_type": "Net",
                        "category": CostCategory.PROCUREMENT,
                        "population_layer_code": None,
                        "is_proportional": True,
                        "conversion_factor": Decimal("1.8"),
                        "invert_conversion_factor": True,
                    },
                    {
                        "name": "PBO Operational",
                        "unit_cost": "0.36",
                        "unit_type": "Net",
                        "category": CostCategory.OPERATIONAL,
                        "population_layer_code": None,
                        "is_proportional": True,
                        "conversion_factor": Decimal("1.8"),
                        "invert_conversion_factor": True,
                    },
                ],
            },
            {
                "name": "Standard Pyrethroid",
                "short_name": "PYR (Routine)",
                "code": "itn_routine",
                "description": "",
                "cost_settings": [
                    {
                        "name": "Standard Pyrethroid Procurement",
                        "unit_cost": "3.49",
                        "unit_type": "Net",
                        "category": CostCategory.PROCUREMENT,
                        "population_layer_code": None,
                        "is_proportional": True,
                        "conversion_factor": Decimal("1.8"),
                        "invert_conversion_factor": True,
                    },
                    {
                        "name": "Standard Pyrethroid Operational",
                        "unit_cost": "0.36",
                        "unit_type": "Net",
                        "category": CostCategory.OPERATIONAL,
                        "population_layer_code": None,
                        "is_proportional": True,
                        "conversion_factor": Decimal("1.8"),
                        "invert_conversion_factor": True,
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
                "code": "itn_school",
                "description": "",
                "cost_settings": [
                    {
                        "name": "Dual AI Procurement",
                        "unit_cost": "3.49",
                        "unit_type": "Net",
                        "category": CostCategory.PROCUREMENT,
                        "population_layer_code": None,
                        "is_proportional": True,
                        "conversion_factor": Decimal("1.8"),
                        "invert_conversion_factor": True,
                    },
                    {
                        "name": "Dual AI Distribution",
                        "unit_cost": "6.25",
                        "unit_type": "Bale",
                        "category": CostCategory.DELIVERY,
                        "population_layer_code": None,
                        "is_proportional": True,
                        "conversion_factor": Decimal("90"),
                        "invert_conversion_factor": True,
                    },
                ],
            },
            {
                "name": "PBO",
                "short_name": "PBO (School)",
                "code": "itn_school",
                "description": "",
                "cost_settings": [
                    {
                        "name": "PBO Procurement",
                        "unit_cost": "3.49",
                        "unit_type": "Net",
                        "category": CostCategory.PROCUREMENT,
                        "population_layer_code": None,
                        "is_proportional": True,
                        "conversion_factor": Decimal("1.8"),
                        "invert_conversion_factor": True,
                    },
                    {
                        "name": "PBO Distribution",
                        "unit_cost": "6.25",
                        "unit_type": "Bale",
                        "category": CostCategory.DELIVERY,
                        "population_layer_code": None,
                        "is_proportional": True,
                        "conversion_factor": Decimal("90"),
                        "invert_conversion_factor": True,
                    },
                ],
            },
            {
                "name": "Standard Pyrethroid",
                "short_name": "PYR (School)",
                "code": "itn_school",
                "description": "",
                "cost_settings": [
                    {
                        "name": "Standard Pyrethroid Procurement",
                        "unit_cost": "0.87",
                        "unit_type": "Net",
                        "category": CostCategory.PROCUREMENT,
                        "population_layer_code": None,
                        "is_proportional": True,
                        "conversion_factor": Decimal("1.8"),
                        "invert_conversion_factor": True,
                    },
                    {
                        "name": "Standard Pyrethroid Distribution",
                        "unit_cost": "6.25",
                        "unit_type": "Bale",
                        "category": CostCategory.DELIVERY,
                        "population_layer_code": None,
                        "is_proportional": True,
                        "conversion_factor": Decimal("90"),
                        "invert_conversion_factor": True,
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
                "cost_settings": [
                    {
                        "name": "R21 Procurement",
                        "unit_cost": "4.00",
                        "unit_type": "Vaccine dose",
                        "category": CostCategory.PROCUREMENT,
                        "population_layer_code": None,
                        "is_proportional": True,
                        "conversion_factor": Decimal("4"),
                    },
                    {
                        "name": "R21 Operational",
                        "unit_cost": "1.00",
                        "unit_type": "Item",
                        "category": CostCategory.OPERATIONAL,
                        "population_layer_code": None,
                    },
                ],
            },
            {
                "name": "RTS,S",
                "code": "vacc",
                "description": "",
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
                "cost_settings": [],
            }
        ],
    },
}


class InterventionSeeder:
    def __init__(self, account, stdout_writer=None):
        self.account = account
        self.stdout_write = stdout_writer or print

    def seed_cost_unit_types(self, print_progress=True):
        """Upsert the default cost unit types and migrate legacy enum-label units.

        Idempotent and non-destructive (apart from removing legacy units whose
        lines have been re-pointed), so it is safe to run standalone on live
        accounts.
        """
        created_count = 0
        updated_count = 0
        for unit_data in COST_UNIT_TYPES:
            _, created = CostUnitType.objects.update_or_create(
                account=self.account,
                name=unit_data["name"],
                defaults={
                    "description": unit_data["description"],
                    "is_commodity": unit_data["is_commodity"],
                },
            )
            if created:
                created_count += 1
            else:
                updated_count += 1
        if print_progress:
            self.stdout_write(
                f"Cost unit types for account {self.account.name}: {created_count} created, {updated_count} updated"
            )

        self._migrate_legacy_cost_unit_types(print_progress)

    def _migrate_legacy_cost_unit_types(self, print_progress):
        """Re-point breakdown lines from legacy enum-label units to the new ones,
        then delete the legacy unit rows."""
        legacy_units = CostUnitType.objects.filter(account=self.account, name__in=LEGACY_UNIT_MAPPING.keys())
        for legacy_unit in legacy_units:
            new_unit = CostUnitType.objects.get(account=self.account, name=LEGACY_UNIT_MAPPING[legacy_unit.name])
            moved_lines = InterventionCostBreakdownLine.objects.filter(unit_type=legacy_unit).update(unit_type=new_unit)
            legacy_unit.delete()
            if print_progress:
                self.stdout_write(
                    f"\tMigrated legacy cost unit '{legacy_unit.name}' -> '{new_unit.name}' "
                    f"({moved_lines} cost breakdown lines re-pointed)"
                )

        unmapped_units = CostUnitType.objects.filter(account=self.account, name__in=UNMAPPED_LEGACY_UNIT_NAMES)
        for unmapped_unit in unmapped_units:
            if print_progress:
                self.stdout_write(
                    f"\tLegacy cost unit '{unmapped_unit.name}' has no mapping to a new unit, "
                    "left untouched - please review manually"
                )

    def create_interventions(self):
        # Always seed/refresh cost unit types, even when intervention seeding
        # is skipped below.
        self.seed_cost_unit_types()

        if InterventionCategory.objects.filter(account=self.account).exists():
            response = (
                input(
                    f"Interventions already exist for account {self.account.name}. "
                    "Do you want to override them? Answering 'n' keeps them and only creates missing ones. (y/N): "
                )
                .strip()
                .lower()
            )
            if response != "y":
                self.stdout_write(
                    f"Keeping existing interventions for account {self.account.name}, creating missing ones only"
                )
            else:
                # Delete existing interventions and categories for this account.
                # Breakdown lines must go first: CostUnitType is protected by them.
                InterventionCostBreakdownLine.objects.filter(
                    intervention__intervention_category__account=self.account
                ).delete()
                InterventionAssignment.objects.filter(
                    intervention__intervention_category__account=self.account
                ).delete()
                Intervention.objects.filter(intervention_category__account=self.account).delete()
                InterventionCategory.objects.filter(account=self.account).delete()
                CostUnitType.objects.filter(account=self.account).delete()
                self.stdout_write(f"Existing interventions for account {self.account.name} have been deleted.")
                # Reseed the units from a clean slate.
                self.seed_cost_unit_types()

        created_by = User.objects.filter(iaso_profile__account=self.account).first()
        if created_by is None:
            self.stdout_write(f"Skipping interventions for account {self.account.name}: no user to set as created_by")
            return
        self.stdout_write(f"Creating interventions for account {self.account.name}:")
        self._create_interventions(created_by)

    def create_interventions_for_api_account(self, user):
        self.seed_cost_unit_types(print_progress=False)
        self._create_interventions(user, print_progress=False)

    def _create_interventions(self, user, print_progress=True):
        # Create budget settings if they don't exist
        self._create_budget_settings(print_progress)

        for category_name, data in CATEGORIES_AND_INTERVENTIONS.items():
            # Look up on the unique constraint ([account, name]) only, so
            # existing rows with a diverging short_name are matched instead of
            # triggering a duplicate INSERT.
            category, created = InterventionCategory.objects.get_or_create(
                name=category_name,
                account=self.account,
                defaults={
                    "short_name": data.get("short_name", category_name),
                    # "description": data["description"],
                    "created_by": user,
                },
            )
            if created and print_progress:
                self.stdout_write(f"Created category: {category_name}")

            for intervention_data in data["interventions"]:
                # Same here: unique constraint is [intervention_category, name].
                intervention, created = Intervention.objects.get_or_create(
                    name=intervention_data["name"],
                    intervention_category=category,
                    defaults={
                        "short_name": intervention_data.get("short_name", intervention_data["name"]),
                        "code": intervention_data["code"],
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
            # Guaranteed to exist: seed_cost_unit_types() runs before this.
            unit_type = CostUnitType.objects.get(account=self.account, name=cost_data["unit_type"])

            # Metric layers come from data imports and may not exist yet at
            # seed time, so resolve leniently and leave the line without a
            # layer when the code is unknown for this account.
            population_layer = None
            if cost_data.get("population_layer_code"):
                population_layer = MetricType.objects.filter(
                    account=self.account, code=cost_data["population_layer_code"]
                ).first()

            InterventionCostBreakdownLine.objects.create(
                intervention=intervention,
                name=cost_data["name"],
                category=cost_data["category"],
                unit_type=unit_type,
                population_layer=population_layer,
                unit_cost=cost_data["unit_cost"],
                is_proportional=cost_data.get("is_proportional", population_layer is not None),
                conversion_factor=cost_data.get("conversion_factor", Decimal("1")),
                invert_conversion_factor=cost_data.get("invert_conversion_factor", False),
                created_by=created_by,
            )
        if print_progress:
            self.stdout_write(f"\t  Created {len(cost_settings)} cost breakdown lines")
