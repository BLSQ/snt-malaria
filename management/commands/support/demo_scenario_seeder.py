"""
Create a demo scenario with intervention assignments for Burkina Faso
"""

import random

from datetime import date

from iaso.models import OrgUnit, User
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
            return

        self.stdout_write(f"Creating demo scenario for account {self.account.name}:")

        # Get the first user associated with this account
        created_by = User.objects.filter(iaso_profile__account=self.account).first()
        if not created_by:
            self.stdout_write("ERROR: No user found for this account")
            return

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
            return

        # Get all org units with geometry from the account's default version
        # We only want org units that have a geometry (can be displayed on a map)
        org_units = OrgUnit.objects.filter(
            version=self.account.default_version,
            validation_status=OrgUnit.VALIDATION_VALID,
            geom__isnull=False,
        )

        if not org_units.exists():
            self.stdout_write("WARNING: No valid org units with geometry found for this account")
            return

        self.stdout_write(
            f"Found {interventions.count()} interventions and {org_units.count()} org units with geometry"
        )

        # Categories to assign across the whole country
        categories_to_assign = [
            "Case Management",
            "IPTp, PMC & SMC",
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

        self.stdout_write("Done creating demo scenario.")
        return scenario
