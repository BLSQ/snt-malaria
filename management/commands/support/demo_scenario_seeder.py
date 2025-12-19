"""
Create a demo scenario with intervention assignments for Burkina Faso
"""

import random

from datetime import date

from snt_malaria_budgeting import DEFAULT_COST_ASSUMPTIONS, BudgetCalculator

from iaso.models import OrgUnit, User
from plugins.snt_malaria.api.budget.utils import (
    build_cost_dataframe,
    build_interventions_input,
    build_population_dataframe,
)
from plugins.snt_malaria.models.budget import Budget
from plugins.snt_malaria.models.intervention import Intervention, InterventionAssignment
from plugins.snt_malaria.models.scenario import Scenario


class DemoScenarioSeeder:
    def __init__(self, account, stdout_writer=None):
        self.account = account
        self.stdout_write = stdout_writer or print

    def create_scenario(self):
        """
        Create a demo scenario with intervention assignments based on org units and interventions.
        """
        # Check if a demo scenario already exists
        if Scenario.objects.filter(account=self.account, name__icontains="Demo").exists():
            self.stdout_write(f"Skipping scenario creation for {self.account.name}, demo scenario already exists")
            return None

        self.stdout_write(f"Creating demo scenario for account {self.account.name}:")

        # Get the first user associated with this account
        created_by = User.objects.filter(iaso_profile__account=self.account).first()
        if not created_by:
            self.stdout_write("ERROR: No user found for this account")
            return None

        # Create the demo scenario
        current_year = date.today().year
        scenario = Scenario.objects.create(
            account=self.account,
            created_by=created_by,
            name=f"Demo Scenario {current_year}-{current_year + 5}",
            description=(
                "This is a demonstration scenario for Burkina Faso showing various malaria "
                "intervention strategies across different districts. The scenario includes "
                "a mix of preventive measures (ITNs, SMC, IPTp), case management, and vaccination interventions."
            ),
            start_year=current_year,
            end_year=current_year + 5,
        )
        self.stdout_write(f"Created scenario: {scenario.name}")

        # Get all interventions for this account
        interventions = Intervention.objects.filter(intervention_category__account=self.account).select_related(
            "intervention_category"
        )

        if not interventions.exists():
            self.stdout_write("WARNING: No interventions found for this account. Run intervention_seeder first.")
            return None

        # Get all org units with geometry from the account's default version
        # We only want org units that have a geometry (can be displayed on a map)
        org_units = OrgUnit.objects.filter(
            version=self.account.default_version,
            validation_status=OrgUnit.VALIDATION_VALID,
            geom__isnull=False,
        )

        if not org_units.exists():
            self.stdout_write("WARNING: No valid org units with geometry found for this account")
            return None

        self.stdout_write(
            f"Found {interventions.count()} interventions and {org_units.count()} org units with geometry"
        )

        # Categories to assign across the whole country
        categories_to_assign = [
            "Case Management",
            "IPTp",
            "PMC & SMC",
            "ITN Campaign",
            "Vaccination",
        ]

        all_assignments = []

        for category_name in categories_to_assign:
            # Get interventions for this category
            category_interventions = interventions.filter(intervention_category__name=category_name)

            if not category_interventions.exists():
                self.stdout_write(f"WARNING: No '{category_name}' interventions found, skipping...")
                continue

            # Convert to list for random selection
            category_interventions_list = list(category_interventions)
            self.stdout_write(
                f"Found {len(category_interventions_list)} '{category_name}' interventions: "
                f"{[i.name for i in category_interventions_list]}"
            )

            # Assign one random intervention from this category to each org unit
            for org_unit in org_units:
                intervention = random.choice(category_interventions_list)
                all_assignments.append(
                    InterventionAssignment(
                        scenario=scenario,
                        org_unit=org_unit,
                        intervention=intervention,
                        created_by=created_by,
                    )
                )

            self.stdout_write(f"Created {len(org_units)} '{category_name}' assignments (one per org unit)")

        # Bulk create all assignments
        total_assignments = len(all_assignments)
        InterventionAssignment.objects.bulk_create(all_assignments)
        self.stdout_write(f"\nTotal assignments created: {total_assignments}")

        # Create a budget for the scenario
        self.stdout_write("\nCreating budget for scenario...")
        try:
            budget = self._create_budget_for_scenario(scenario, created_by)
            self.stdout_write(f"Created budget: {budget.name}")
        except Exception as e:
            self.stdout_write(f"WARNING: Failed to create budget: {e}")

        self.stdout_write("Done creating demo scenario.")
        return scenario

    def _create_budget_for_scenario(self, scenario, created_by):
        """
        Create a budget for the given scenario using the budget calculator.
        """
        start_year = scenario.start_year
        end_year = scenario.end_year

        # Build cost and population dataframes and format the intervention plan
        cost_df = build_cost_dataframe(self.account, start_year, end_year)
        population_df = build_population_dataframe(self.account, start_year, end_year)
        interventions_input = build_interventions_input(scenario)

        # Build a quick lookup map ((code, type) -> id) for fast id retrieval
        interventions = Intervention.objects.filter(intervention_category__account=self.account)
        interventions_map = {(iv.code, iv.name): iv.id for iv in interventions}

        # Use default cost assumptions
        settings = DEFAULT_COST_ASSUMPTIONS

        budgets = []
        budget_calculator = BudgetCalculator(
            interventions_input=interventions_input,
            settings=settings,
            cost_df=cost_df,
            population_df=population_df,
            local_currency="USD",
            budget_currency="USD",
            spatial_planning_unit="org_unit_id",
        )

        # Calculate budget for each year
        for year in range(start_year, end_year + 1):
            interventions_costs = budget_calculator.get_interventions_costs(year)
            places_costs = budget_calculator.get_places_costs(year)

            # Adjust cost breakdown category field name
            for intervention in interventions_costs:
                for cost_breakdown in intervention["cost_breakdown"]:
                    cost_breakdown["category"] = cost_breakdown.pop("cost_class", None)

            # Adjust place costs field names and attach intervention IDs
            for place_cost in places_costs:
                place_cost["org_unit_id"] = place_cost.pop("place")

                for place_cost_intervention in place_cost.get("interventions", []):
                    code = place_cost_intervention["code"]
                    type_ = place_cost_intervention["type"]
                    intervention_id = interventions_map.get((code, type_))
                    place_cost_intervention["id"] = intervention_id

            budgets.append({"year": year, "interventions": interventions_costs, "org_units_costs": places_costs})

        # Create the budget object
        budget = Budget.objects.create(
            scenario=scenario,
            name=f"Budget for {scenario.name}",
            cost_input={},
            assumptions=settings,
            results=budgets,
            created_by=created_by,
            updated_by=created_by,
        )

        return budget
