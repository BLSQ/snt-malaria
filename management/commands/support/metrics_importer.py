"""
Metrics importer for processing CSV files and importing data into Django models.

This module handles finding, validating, and importing metrics data from CSV files
into MetricType and MetricValue models, including legend configuration.
"""

import csv

from django.core.management.base import CommandError
from django.db import transaction

from iaso.models import MetricType, MetricValue, OrgUnit
from iaso.utils.legend import get_legend_config


class MetricsImporter:
    """Handles importing metrics data from CSV files."""

    def __init__(self, account, style, stdout_writer=None):
        """Initialize the metrics importer.

        Args:
            account: Account instance for importing metrics
            style: Style instance for formatting output
            stdout_writer: Optional writer for progress output (e.g., self.stdout.write)
        """
        self.account = account
        self.style = style
        self.stdout_write = stdout_writer or print
        self.metric_type_scales = {}

    def import_metrics(self, metadata_file_path, dataset_file_path, pop_dataset_file_path=None):
        """Import metrics from CSV files.

        Args:
            metadata_file_path: Path to the metadata CSV file
            dataset_file_path: Path to the dataset CSV file

        Returns:
            Number of metric values created
        """
        try:
            self.stdout_write(f"Using metadata file: {metadata_file_path}")
            self.stdout_write(f"Using dataset file: {dataset_file_path}")

            account_org_units = OrgUnit.objects.filter(
                version__account=self.account, version=self.account.default_version
            )

            org_units_mapping = {ou.source_ref: ou for ou in account_org_units}

            # Import the metrics
            metrics_count = self._process_metrics_import(metadata_file_path, dataset_file_path, org_units_mapping)
            popmetrics_count = (
                self._process_population_metrics_import(pop_dataset_file_path, org_units_mapping)
                if pop_dataset_file_path
                else 0
            )
            return metrics_count + popmetrics_count

        except Exception as e:
            raise CommandError(f"Failed to import metrics: {str(e)}")

    def _validate_csv_files(self, metadata_file, dataset_file):
        # Validate metadata file
        required_metadata_columns = [
            "TYPE",
            "LABEL",
            "SCALE",
            "UNITS",
            "SOURCE",
            "CATEGORY",
            "VARIABLE",
            "DESCRIPTION",
            "UNIT_SYMBOL",
        ]

        if metadata_file is not None:
            with open(metadata_file, newline="", encoding="utf-8") as metafile:
                metareader = csv.DictReader(metafile)
                missing_columns = set(required_metadata_columns) - set(metareader.fieldnames)
                if missing_columns:
                    raise CommandError(f"Metadata file missing required columns: {', '.join(missing_columns)}")

        # Validate dataset file has ADM2_ID column
        with open(dataset_file, newline="", encoding="utf-8") as csvfile:
            csvreader = csv.DictReader(csvfile)
            if "ADM2_ID" not in csvreader.fieldnames:
                raise CommandError("Dataset file missing required column: ADM2_ID")

        self.stdout_write("CSV file validation passed")

    def _process_population_metrics_import(self, pop_dataset_file_path, org_units_mapping):
        self._validate_csv_files(None, pop_dataset_file_path)
        with open(pop_dataset_file_path, newline="", encoding="utf-8") as pop_dataset_file:
            self.stdout_write("Creating MetricTypes from population dataset file...")
            pop_metric_types = self._create_pop_metric_types(pop_dataset_file)
            self.stdout_write("Reading values from population dataset file...")
            pop_value_count = self._create_metric_values(pop_dataset_file, pop_metric_types, org_units_mapping)

        self.stdout_write(self.style.SUCCESS("Metrics population import completed successfully!"))

        return pop_value_count

    def _process_metrics_import(self, metadata_file_path, dataset_file_path, org_units_mapping):
        # Validate CSV files first
        self._validate_csv_files(metadata_file_path, dataset_file_path)

        self.stdout_write("Clearing existing metric values...")
        MetricValue.objects.select_related("metric_type").filter(
            metric_type__account=self.account, metric_type__origin=MetricType.MetricTypeOrigin.OPENHEXA
        ).delete()

        self.stdout_write("Updating MetricTypes from metadata file...")
        with open(metadata_file_path, newline="", encoding="utf-8") as metafile:
            metric_types = self._update_metric_types(metafile)

        self.stdout_write("Reading values from dataset file...")
        with open(dataset_file_path, newline="", encoding="utf-8") as csvfile:
            value_count = self._create_metric_values(csvfile, metric_types, org_units_mapping)
        self.stdout_write("Adding threshold scales...")
        self._configure_legends()

        self.stdout_write(self.style.SUCCESS("Metrics import completed successfully!"))
        return value_count

    def _update_metric_types(self, metafile):
        metric_types = {}

        metareader = csv.DictReader(metafile)
        existing_metric_types = (
            MetricType.objects.filter(account=self.account, origin=MetricType.MetricTypeOrigin.OPENHEXA)
            .order_by("code")
            .distinct("code")
            .in_bulk(field_name="code")
        )

        to_create = []
        to_update = []

        self.stdout_write(f"existing_metric_types keys: {list(existing_metric_types.keys())}")

        for row in metareader:
            try:
                metric_type = existing_metric_types.get(row["VARIABLE"])
                if metric_type:
                    metric_type.name = row["LABEL"]
                    metric_type.description = row["DESCRIPTION"]
                    metric_type.source = row["SOURCE"]
                    metric_type.units = row["UNITS"]
                    metric_type.category = row["CATEGORY"]
                    metric_type.unit_symbol = row["UNIT_SYMBOL"]
                    metric_type.legend_type = row["TYPE"].lower()
                    metric_type.is_utility = row.get("IS_UTILITY", "False").lower() == "true"
                    metric_type.origin = MetricType.MetricTypeOrigin.OPENHEXA
                    to_update.append(metric_type)
                    self.stdout_write(
                        f"Update metric type: {metric_type.name} with legend type: {metric_type.legend_type}"
                    )
                else:
                    metric_type = MetricType(
                        account=self.account,
                        name=row["LABEL"],
                        code=row["VARIABLE"],
                        description=row["DESCRIPTION"],
                        source=row["SOURCE"],
                        units=row["UNITS"],
                        category=row["CATEGORY"],
                        unit_symbol=row["UNIT_SYMBOL"],
                        legend_type=row["TYPE"].lower(),
                        is_utility=row.get("IS_UTILITY", "False").lower() == "true",
                        origin=MetricType.MetricTypeOrigin.OPENHEXA,
                    )
                    to_create.append(metric_type)
                    self.stdout_write(
                        f"Create metric type: {metric_type.name} with legend type: {metric_type.legend_type}"
                    )

                existing_metric_types.pop(row["VARIABLE"], None)

                if metric_type.legend_type not in ["ordinal", "threshold", "linear"]:
                    self.stdout_write(
                        self.style.WARNING(
                            f"WARNING: Metric type for {metric_type.name} is '{metric_type.legend_type}', "
                            "should be one of 'ordinal', 'threshold', or 'linear'. Defaulting to 'threshold'."
                        )
                    )

                self.metric_type_scales[metric_type.code] = row["SCALE"]
                metric_types[metric_type.code] = metric_type
            except Exception as e:
                self.stdout_write(f"ERROR: Error creating MetricType: {row['LABEL']}")

        created_metrics = MetricType.objects.bulk_create(to_create)
        self.stdout_write(f"Created {len(created_metrics)} new MetricTypes.")
        amount_of_updates = MetricType.objects.bulk_update(
            to_update,
            fields=[
                "name",
                "description",
                "source",
                "units",
                "category",
                "unit_symbol",
                "legend_type",
                "is_utility",
                "origin",
            ],
        )
        self.stdout_write(f"Updated {amount_of_updates} existing MetricTypes.")
        deleted_count, _ = MetricType.objects.filter(
            account=self.account, code__in=existing_metric_types.keys()
        ).delete()
        self.stdout_write(f"Deleted {deleted_count} MetricTypes.")

        return metric_types

    def _create_pop_metric_types(self, pop_dataset_file):
        csvreader = csv.DictReader(pop_dataset_file)
        pop_metric_types = {}

        columns = (
            col
            for col in csvreader.fieldnames
            if str.lower(col) not in ["year", "adm1_id", "adm2_id", "adm1_name", "adm2_name", "population"]
            # POPULATION is excluded as it is already in other metric file
        )

        for col in columns:
            try:
                metric_type = MetricType.objects.create(
                    account=self.account,
                    name=col,
                    code=col,
                    is_utility=True,
                )
                self.stdout_write(f"Created Population MetricType: {metric_type.name}")
                pop_metric_types[col] = metric_type
            except Exception as e:
                self.stdout_write(f"ERROR: Error creating Population MetricType: {col}")

        pop_dataset_file.seek(0)
        return pop_metric_types

    def _create_metric_values(self, csvfile, metric_types, org_units_mapping):
        csvreader = csv.DictReader(csvfile)

        try:
            with transaction.atomic():
                row_count = 0
                value_count = 0
                for row in csvreader:
                    row_count += 1
                    try:
                        # Get the OrgUnit by source_ref using ADM2_ID
                        org_unit = org_units_mapping.get(row["ADM2_ID"])
                    except OrgUnit.DoesNotExist:
                        self.stdout_write(f"Row {row_count}: OrgUnit not found for source_ref: {row['ADM2_ID']}")
                        continue

                    # Create MetricValue for each metric type
                    for column, metric_type in metric_types.items():
                        if column not in row:
                            continue
                        if not row[column]:
                            continue

                        string_value = ""
                        try:
                            # Parse the value as a float
                            value = float(row[column])
                        except ValueError:
                            value = None
                            string_value = row[column]

                        # Create the MetricValue
                        MetricValue.objects.create(
                            metric_type=metric_type, org_unit=org_unit, value=value, string_value=string_value
                        )
                        value_count += 1

                self.stdout_write(f"Processed {row_count} rows, created {value_count} metric values")
                return value_count

        except Exception as e:
            self.stdout_write(f"ERROR: Error during import, rolling back transaction: {str(e)}")
            raise

    def _configure_legends(self):
        for metric_type in MetricType.objects.filter(account=self.account):
            metric_type.legend_config = get_legend_config(metric_type, self.metric_type_scales[metric_type.code])
            metric_type.save()
