import csv
import os

from django.core.management.base import BaseCommand
from django.db import transaction

from iaso.models import MetricType, MetricValue, OrgUnit

from .support.legend import get_legend_config, get_legend_type


BURKINA_ACCOUNT_ID = 1
# To use this script in it's current form, you need to add these files to the correct folder
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
                        try:
                            # Parse the value as a float
                            value = float(row[column])

                            # Some percentages are expressed as between 0 and 1,
                            # adapt them to be also between 0 and 100.
                            if metric_type.code in ["PFPR_2TO10_MAP"] or metric_type.category in [
                                "Bednet coverage",
                                "DHS DTP3 Vaccine",
                            ]:
                                value = int(value * 100)
                            else:
                                # Round the value to max 3 behind the comma
                                value = round(value, 3)

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

        print("Adding threshold scales...")
        for metric_type in MetricType.objects.all():
            metric_type.legend_config = get_legend_config(metric_type)
            metric_type.legend_type = get_legend_type(metric_type)
            metric_type.save()
        print("Done.")
