import csv
import os

from django.core.management.base import BaseCommand
from django.db import transaction

from iaso.models import Account, MetricType, MetricValue, OrgUnit


class Command(BaseCommand):
    help = "Import Nigerian population data from CSV into MetricTypes and MetricValues"

    def add_arguments(self, parser):
        parser.add_argument("--account_id", type=int, required=True, help="Account ID for the metric types and values")
        parser.add_argument(
            "--clear-existing",
            action="store_true",
            help="Clear existing population metrics for this account before importing",
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
        csv_path = os.path.join(script_dir, "support", "NGA_admin_pop_for_dash.csv")

        if not os.path.exists(csv_path):
            self.stderr.write(f"CSV file not found: {csv_path}")
            return

        if clear_existing and not dry_run:
            self.stdout.write("Clearing existing population metrics for this account")
            MetricValue.objects.filter(
                metric_type__account=account, metric_type__name__in=["Population", "Population under 5"]
            ).delete()
            MetricType.objects.filter(account=account, name__in=["Population", "Population under 5"]).delete()

        self.import_population_data(csv_path, account, dry_run)

    def import_population_data(self, csv_path, account, dry_run):
        # Define the metric types
        metric_type_configs = {
            "Population": {
                "code": "population_total",
                "description": "Total population in the administrative area",
                "source": "Nigerian Administrative Population Data",
                "units": "people",
                "unit_symbol": "",
                "category": "Demographics",
                "legend_type": "linear",
            },
            "Population under 5": {
                "code": "population_under_5",
                "description": "Population under 5 years old in the administrative area",
                "source": "Nigerian Administrative Population Data",
                "units": "people",
                "unit_symbol": "",
                "category": "Demographics",
                "legend_type": "linear",
            },
        }

        if dry_run:
            self.stdout.write("DRY RUN - Would create the following metric types:")
            for name, config in metric_type_configs.items():
                self.stdout.write(f"  - {name}: {config['description']}")
            self.stdout.write("Would import population data (no year specified)")

        # Create or get metric types
        metric_types = {}
        for name, config in metric_type_configs.items():
            if dry_run:
                continue

            metric_type, created = MetricType.objects.get_or_create(
                account=account,
                name=name,
                defaults={
                    "code": config["code"],
                    "description": config["description"],
                    "source": config["source"],
                    "units": config["units"],
                    "unit_symbol": config["unit_symbol"],
                    "category": config["category"],
                    "legend_type": config["legend_type"],
                },
            )

            if created:
                self.stdout.write(self.style.SUCCESS(f"Created MetricType: {name}"))
            else:
                self.stdout.write(f"MetricType already exists: {name}")

            metric_types[name] = metric_type

        # Read and process the CSV file
        processed_count = 0
        skipped_count = 0

        self.stdout.write(f"Processing CSV file: {csv_path}")

        with open(csv_path, "r", encoding="utf-8") as file:
            reader = csv.DictReader(file)

            with transaction.atomic():
                for row in reader:
                    admin_name = row["admin_name"].strip()
                    state = row["State"].strip()
                    pop_size = int(row["pop_size"])
                    pop_size_u5 = int(row["pop_size_U5"])

                    if dry_run:
                        if processed_count < 5:  # Show first 5 examples
                            self.stdout.write(
                                f"Would import: {admin_name}, {state} - Pop: {pop_size}, U5: {pop_size_u5}"
                            )
                        processed_count += 1
                        continue

                    # Find the corresponding org unit
                    # Try to match by name first, then by name + state if there are duplicates
                    org_units = OrgUnit.objects.filter(name__iexact=admin_name, version__account=account)

                    if org_units.count() == 0:
                        self.stderr.write(f"WARNING: No org unit found for '{admin_name}' in {state}")
                        skipped_count += 1
                        continue
                    elif org_units.count() > 1:
                        # If multiple matches, try to find the one in the correct state
                        state_filtered = org_units.filter(parent__name__iexact=state)
                        if state_filtered.exists():
                            org_unit = state_filtered.first()
                        else:
                            org_unit = org_units.first()
                            self.stderr.write(
                                f"WARNING: Multiple org units found for '{admin_name}', using first match"
                            )
                    else:
                        org_unit = org_units.first()

                    # Create metric values
                    for metric_name, value in [("Population", pop_size), ("Population under 5", pop_size_u5)]:
                        metric_value, created = MetricValue.objects.update_or_create(
                            metric_type=metric_types[metric_name],
                            org_unit=org_unit,
                            year=None,
                            defaults={"value": value},
                        )

                        if created:
                            processed_count += 1

                    if processed_count % 100 == 0:
                        self.stdout.write(f"Processed {processed_count} records...")

        if dry_run:
            self.stdout.write(f"DRY RUN completed. Would process {processed_count} LGAs")
        else:
            self.stdout.write("-" * 60)
            self.stdout.write(self.style.SUCCESS(f"Import completed!"))
            self.stdout.write(
                f"- Records processed: {processed_count // 2} LGAs"
            )  # Divide by 2 since we create 2 metrics per LGA
            self.stdout.write(f"- Records skipped: {skipped_count}")
            self.stdout.write(f"- MetricValues created: {processed_count}")

            # Configure legends using the legend utility
            self._configure_legends(account)
            self.stdout.write("- Legends configured")

    def _configure_legends(self, account):
        """Configure legends for the population metric types using the legend utility."""
        # Import legend functionality
        from plugins.snt_malaria.management.commands.support.legend import get_legend_config

        for metric_type in MetricType.objects.filter(account=account, name__in=["Population", "Population under 5"]):
            # Pass empty string for scale since we're using linear legend type
            metric_type.legend_config = get_legend_config(metric_type, "")
            metric_type.save()
            self.stdout.write(f"Configured legend for: {metric_type.name}")
