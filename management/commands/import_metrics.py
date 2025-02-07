import csv
import os

from django.db import transaction
from django.core.management.base import BaseCommand

from iaso.models import MetricType, MetricValue, OrgUnit

ACCOUNT_ID = 1
CSV_FILE_PATH = os.path.join(os.path.dirname(__file__), "BFA_epi_indicators_pop.csv")


class Command(BaseCommand):
    help = "Script to import metrics (covariates) from OpenHEXA into SNT Malaria"

    def handle(self, *args, **options):
        # Open the CSV file
        with open(CSV_FILE_PATH, newline="", encoding="utf-8") as csvfile:
            csvreader = csv.DictReader(csvfile)
            # Get column names from the CSV file
            columns = csvreader.fieldnames

            # Start a database transaction
            with transaction.atomic():
                # Create MetricType instances for each column (except ADM1, ADM2, ADM1_ID, and ADM2_ID)
                metric_types = {}
                for column in columns:
                    if column not in ["ADM1", "ADM2", "ADM1_ID", "ADM2_ID"]:
                        # Create or get the MetricType
                        metric_type, created = MetricType.objects.get_or_create(
                            account_id=ACCOUNT_ID, name=column
                        )
                        metric_types[column] = metric_type

                # Loop through each row in the CSV file
                for row in csvreader:
                    # Get the OrgUnit by source_ref using ADM2_ID
                    try:
                        org_unit = OrgUnit.objects.get(source_ref=row["ADM2_ID"])
                    except OrgUnit.DoesNotExist:
                        print(f"OrgUnit not found for source_ref: {row['ADM2_ID']}")
                        continue

                    # Create MetricValue for each metric type
                    for column, metric_type in metric_types.items():
                        # Parse the value from the CSV
                        try:
                            value = float(row[column])
                        except ValueError:
                            print(f"Invalid value for {column}: {row[column]}")
                            continue

                        # Create the MetricValue
                        MetricValue.objects.create(
                            metric_type=metric_type, org_unit=org_unit, value=value
                        )

        print("Data import complete.")
