import csv
import os

from django.db import transaction
from django.core.management.base import BaseCommand

from iaso.models import MetricType, MetricValue, OrgUnit

ACCOUNT_ID = 1
DATA_CSV_FILE_PATH = os.path.join(
    os.path.dirname(__file__), "BFA_epi_indicators_pop.csv"
)
METADATA_CSV_FILE_PATH = os.path.join(
    os.path.dirname(__file__), "epi_indicators_explained.csv"
)


class Command(BaseCommand):
    help = "Script to import metrics (covariates) from OpenHEXA into SNT Malaria"

    def handle(self, *args, **options):
        print("Reading metadata file")
        metadata = {}
        with open(METADATA_CSV_FILE_PATH, newline="", encoding="utf-8") as metafile:
            metareader = csv.DictReader(metafile)
            for row in metareader:
                metric_name = row["epi_indicator"]
                print(f"\tMetric: {metric_name}")
                metadata[metric_name] = {
                    "description": row["description"],
                    "source": row["source"],
                    "units": row["units"],
                    "comments": row["comments"],
                }

        print("Reading data file")
        with open(DATA_CSV_FILE_PATH, newline="", encoding="utf-8") as csvfile:
            csvreader = csv.DictReader(csvfile)
            # Get column names from the CSV file
            columns = csvreader.fieldnames

            # Start a database transaction
            with transaction.atomic():
                # Create or update MetricType instances for each column
                # (except ADM1, ADM2, ADM1_ID, and ADM2_ID)
                metric_types = {}
                for column in columns:
                    if column not in ["ADM1", "ADM2", "ADM1_ID", "ADM2_ID"]:
                        # Get metadata for this metric type if available
                        meta = metadata.get(column, {})

                        metric_type, created = MetricType.objects.get_or_create(
                            account_id=ACCOUNT_ID,
                            name=column,
                            defaults={
                                "description": meta.get("description", ""),
                                "source": meta.get("source", ""),
                                "units": meta.get("units", ""),
                                "comments": meta.get("comments", ""),
                            },
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
