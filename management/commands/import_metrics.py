import csv
import os

from django.db import transaction
from django.core.management.base import BaseCommand

from iaso.models import MetricType, MetricValue, OrgUnit

BURKINA_ACCOUNT_ID = 1
METADATA_CSV_FILE_PATH = os.path.join(os.path.dirname(__file__), "burkina_faso/metric_types.csv")
DATA_CSV_FILE_PATH = os.path.join(os.path.dirname(__file__), "burkina_faso/metric_values.csv")


class Command(BaseCommand):
    help = "Script to import metrics (covariates) from OpenHEXA into SNT Malaria"

    def handle(self, *args, **options):
        print("Clearing existing metrics")
        MetricValue.objects.all().delete()
        MetricType.objects.all().delete()

        print("Creating MetricTypes from metric_types.csv file...")
        metric_types = {}
        with open(METADATA_CSV_FILE_PATH, newline="", encoding="utf-8") as metafile:
            metareader = csv.DictReader(metafile)
            for row in metareader:
                metric_type = MetricType.objects.create(
                    account_id=BURKINA_ACCOUNT_ID,
                    name=row["label"],
                    code=row["column_name"],
                    description=row["description"],
                    source=row["source"],
                    units=row["units"],
                    comments=row["comments"],
                    category=row["category"],
                    unit_symbol=row["unit_symbol"],
                    legend_threshold=self.get_legend_thresholds_for_metric_category(row["category"]),
                )
                self.stdout.write(self.style.SUCCESS(f"Created metric: {metric_type.name}"))
                metric_types[metric_type.code] = metric_type

        print("Done.")

        print("Reading values from metric_values.csv file...")
        with open(DATA_CSV_FILE_PATH, newline="", encoding="utf-8") as csvfile:
            csvreader = csv.DictReader(csvfile)

            with transaction.atomic():
                for row in csvreader:
                    try:
                        # Get the OrgUnit by source_ref using ADM2_ID
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
                            metric_type=metric_type,
                            org_unit=org_unit,
                            value=value,
                        )
        print("Done.")

    def get_legend_thresholds_for_metric_category(self, category):
        if category == "Incidence":
            return {
                "domain": [5, 50, 100, 200, 300, 500],
                "range": [
                    "#FFCCBC",
                    "#FFAB91",
                    "#FF8A65",
                    "#FF5722",
                    "#DB3C0B",
                    "#8B2B0E",
                    "#601B06",
                ],
            }
        elif category == "Prevalence":
            return {
                "domain": [10, 20, 30, 40, 50, 60, 70, 80],
                "range": [
                    "#FFCCBC",
                    "#FFAB91",
                    "#FF8A65",
                    "#FF7043",
                    "#FF5722",
                    "#DB3C0B",
                    "#B83B14",
                    "#8B2B0E",
                    "#601B06",
                ],
            }
        else:
            return {}
