import csv
import os

from django.core.management.base import BaseCommand
from django.db import transaction

from iaso.models import User, Account, OrgUnit
from plugins.snt_malaria.models import InterventionAssignment, Scenario
from plugins.snt_malaria.models.intervention import Intervention, InterventionMix


# Mapping from CSV intervention names to database intervention names
INTERVENTION_NAME_MAPPING = {
    "IG2 ITN": "IG2 ITNs",
    "ITN": "PYR",  # pyrethroid-only ITNs
}


class Command(BaseCommand):
    help = "Import baseline scenario data from CSV file to create 'Current scenario' with InterventionAssignments"

    def add_arguments(self, parser):
        parser.add_argument("--account_id", type=int, required=True, help="Account ID for the scenario")
        parser.add_argument(
            "--clear-existing",
            action="store_true",
            help="Clear existing 'Current scenario' for this account before importing",
        )
        parser.add_argument(
            "--dry-run", action="store_true", help="Show what would be imported without actually importing"
        )

    def handle(self, *args, **options):
        account_id = options["account_id"]
        clear_existing = options["clear_existing"]
        dry_run = options["dry_run"]

        try:
            account = Account.objects.get(id=account_id)
        except Account.DoesNotExist:
            self.stderr.write(f"Account with ID {account_id} does not exist")
            return

        script_dir = os.path.dirname(os.path.abspath(__file__))
        csv_path = os.path.join(script_dir, "support", "baseline_for_dashboard.csv")

        if not os.path.exists(csv_path):
            self.stderr.write(f"CSV file not found: {csv_path}")
            return

        self.stdout.write(f"Account: {account.name}")
        self.stdout.write("-" * 60)

        if clear_existing and not dry_run:
            self.stdout.write("Clearing existing 'Current scenario' for this account")
            existing_scenario = Scenario.objects.filter(account=account, name="Current scenario").first()
            if existing_scenario:
                InterventionAssignment.objects.filter(scenario=existing_scenario).delete()
                existing_scenario.delete()
                self.stdout.write("Cleared existing scenario")

        self.import_baseline_scenario(csv_path, account, dry_run)

    def import_baseline_scenario(self, csv_path, account, dry_run):
        scenario_name = "Current scenario"

        # Get a user for the created_by field
        created_by = User.objects.filter(iaso_profile__account=account).first()
        if not created_by:
            self.stderr.write(f"No user found for account {account.name}")
            return

        if dry_run:
            self.stdout.write(f"DRY RUN - Would create scenario: {scenario_name}")
            self.stdout.write("Would create InterventionAssignments based on CSV data")
            self.stdout.write("Available intervention name mappings:")
            for csv_name, db_name in INTERVENTION_NAME_MAPPING.items():
                self.stdout.write(f"  {csv_name} -> {db_name}")
        else:
            # Create or get the scenario
            scenario, created = Scenario.objects.get_or_create(
                name=scenario_name,
                account=account,
                defaults={
                    "created_by": created_by,
                    "description": "Baseline scenario imported from dashboard data",
                },
            )

            if created:
                self.stdout.write(self.style.SUCCESS(f"Created scenario: {scenario_name}"))
            else:
                self.stdout.write(f"Using existing scenario: {scenario_name}")

        # Process CSV data
        processed_count = 0
        skipped_count = 0
        assignments = []
        intervention_mixes_data = {}  # Track intervention mixes to create

        self.stdout.write(f"Processing CSV file: {csv_path}")

        with open(csv_path, "r", encoding="utf-8") as file:
            reader = csv.DictReader(file)

            for row in reader:
                country = row["country"].strip()
                admin_name = row["admin_name"].strip()
                intervention_package = row["intervention_package"].strip()
                coverage = row["coverage"].strip()

                # Skip non-Nigeria entries
                if country != "Nigeria":
                    continue

                if dry_run:
                    if processed_count < 5:  # Show first 5 examples
                        mapped_intervention = INTERVENTION_NAME_MAPPING.get(intervention_package, intervention_package)
                        self.stdout.write(
                            f"Would import: {admin_name} -> {intervention_package} ({mapped_intervention}) - {coverage}"
                        )
                    processed_count += 1
                    continue

                # Find the corresponding org unit
                org_units = OrgUnit.objects.filter(name__iexact=admin_name, version__account=account)

                if org_units.count() == 0:
                    self.stderr.write(f"WARNING: No org unit found for '{admin_name}'")
                    skipped_count += 1
                    continue
                elif org_units.count() > 1:
                    self.stderr.write(f"WARNING: Multiple org units found for '{admin_name}', using first match")
                    org_unit = org_units.first()
                else:
                    org_unit = org_units.first()

                # Map intervention name
                mapped_intervention_name = INTERVENTION_NAME_MAPPING.get(intervention_package, intervention_package)

                # Find the intervention
                try:
                    intervention = Intervention.objects.get(
                        name=mapped_intervention_name,
                        intervention_category__account=account,
                    )
                except Intervention.DoesNotExist:
                    self.stderr.write(
                        f"WARNING: No intervention found for '{mapped_intervention_name}' (from '{intervention_package}')"
                    )
                    skipped_count += 1
                    continue

                # Get or create intervention mix for this intervention package
                intervention_mix_name = f"{intervention_package}_mix"

                # Track intervention mix data
                if intervention_mix_name not in intervention_mixes_data:
                    intervention_mixes_data[intervention_mix_name] = {
                        "mix": InterventionMix(
                            account=account,
                            name=intervention_mix_name,
                            scenario=scenario,
                        ),
                        "intervention": intervention,
                        "intervention_package": intervention_package,
                    }

                # Create intervention assignment (will be updated with saved mix later)
                assignment = InterventionAssignment(
                    scenario=scenario,
                    org_unit=org_unit,
                    intervention_mix=intervention_mixes_data[intervention_mix_name]["mix"],
                    created_by=created_by,
                )
                assignments.append(assignment)
                processed_count += 1

                if processed_count % 100 == 0:
                    self.stdout.write(f"Processed {processed_count} records...")

        if dry_run:
            self.stdout.write(f"DRY RUN completed. Would process {processed_count} records for Nigeria")
        else:
            # Bulk create intervention mixes and assignments
            with transaction.atomic():
                # First, create all intervention mixes
                if intervention_mixes_data:
                    mixes_to_create = [data["mix"] for data in intervention_mixes_data.values()]
                    InterventionMix.objects.bulk_create(mixes_to_create)

                    # Now get the saved mixes and add interventions to them
                    for mix_name, mix_data in intervention_mixes_data.items():
                        # Get the saved mix
                        saved_mix = InterventionMix.objects.get(name=mix_name, scenario=scenario, account=account)
                        # Add the intervention to the mix
                        saved_mix.interventions.add(mix_data["intervention"])

                        # Update all assignments to point to the saved mix
                        for assignment in assignments:
                            if assignment.intervention_mix.name == mix_name:
                                assignment.intervention_mix = saved_mix

                # Create intervention assignments
                InterventionAssignment.objects.bulk_create(assignments)

            self.stdout.write("-" * 60)
            self.stdout.write(self.style.SUCCESS("Import completed!"))
            self.stdout.write(f"- Scenario: {scenario_name}")
            self.stdout.write(f"- Records processed: {processed_count}")
            self.stdout.write(f"- Records skipped: {skipped_count}")
            self.stdout.write(f"- InterventionAssignments created: {len(assignments)}")

            # Show intervention mix summary
            mix_counts = {}
            for mix_name, mix_data in intervention_mixes_data.items():
                mix_counts[mix_data["intervention_package"]] = 0

            for assignment in assignments:
                for mix_name, mix_data in intervention_mixes_data.items():
                    if assignment.intervention_mix.name == mix_name:
                        mix_counts[mix_data["intervention_package"]] += 1
                        break

            self.stdout.write(f"- InterventionMixes created: {len(intervention_mixes_data)}")
            self.stdout.write("\nIntervention assignments summary:")
            for intervention_package, count in sorted(mix_counts.items()):
                self.stdout.write(f"  {intervention_package}: {count} LGAs")
