"""
Metrics importer for processing CSV files and importing data into Django models.

This module handles finding, validating, and importing metrics data from CSV files
into MetricType and MetricValue models, including legend configuration.
"""

import csv

from pathlib import Path

from django.core.management.base import CommandError
from django.db import transaction

from iaso.models import MetricType, MetricValue, OrgUnit


class MetricsImporter:
    """Handles importing metrics data from CSV files."""

    def __init__(self, account, stdout_writer=None):
        """Initialize the metrics importer.

        Args:
            account: Account instance for importing metrics
            stdout_writer: Optional writer for progress output (e.g., self.stdout.write)
        """
        self.account = account
        self.stdout_write = stdout_writer or print
        self.metric_type_scales = {}

    def import_metrics(self, metadata_file_path, dataset_file_path):
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

            # Import the metrics
            return self._process_metrics_import(metadata_file_path, dataset_file_path)

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

    def _process_metrics_import(self, metadata_file_path, dataset_file_path):
        # Validate CSV files first
        self._validate_csv_files(metadata_file_path, dataset_file_path)

        self.stdout_write("Clearing existing metrics...")
        MetricValue.objects.filter(metric_type__account=self.account).delete()
        MetricType.objects.filter(account=self.account).delete()

        self.stdout_write("Creating MetricTypes from metadata file...")
        metric_types = self._create_metric_types(metadata_file_path)

        self.stdout_write("Reading values from dataset file...")
        value_count = self._create_metric_values(dataset_file_path, metric_types)

        self.stdout_write("Adding threshold scales...")
        self._configure_legends()

        self.stdout_write("Metrics import completed successfully!")
        return value_count

    def _create_metric_types(self, metadata_file_path):
        metric_types = {}

        with open(metadata_file_path, newline="", encoding="utf-8") as metafile:
            metareader = csv.DictReader(metafile)
            for row in metareader:
                try:
                    metric_type = MetricType.objects.create(
                        account=self.account,
                        name=row["LABEL"],
                        code=row["VARIABLE"],
                        description=row["DESCRIPTION"],
                        source=row["SOURCE"],
                        units=row["UNITS"],
                        category=row["CATEGORY"],
                        unit_symbol=row["UNIT_SYMBOL"],
                        legend_type=row["TYPE"].lower(),
                    )

                    self.stdout_write(f"Created metric: {metric_type.name} with legend type: {metric_type.legend_type}")
                    scale = row["SCALE"]

                    self.metric_type_scales[metric_type.code] = scale
                    metric_types[metric_type.code] = metric_type
                except Exception as e:
                    self.stdout_write(f"ERROR: Error creating MetricType: {row['LABEL']}")

        return metric_types

    def _create_metric_values(self, dataset_file_path, metric_types):
        with open(dataset_file_path, newline="", encoding="utf-8") as csvfile:
            csvreader = csv.DictReader(csvfile)

            try:
                with transaction.atomic():
                    row_count = 0
                    value_count = 0
                    for row in csvreader:
                        row_count += 1
                        try:
                            # Get the OrgUnit by source_ref using ADM2_ID
                            org_unit = OrgUnit.objects.get(source_ref=row["ADM2_ID"])
                        except OrgUnit.DoesNotExist:
                            self.stdout_write(f"Row {row_count}: OrgUnit not found for source_ref: {row['ADM2_ID']}")
                            continue

                        # Create MetricValue for each metric type
                        for column, metric_type in metric_types.items():
                            if column not in row:
                                continue
                            if not row[column]:
                                continue

                            string_value = None
                            try:
                                # Parse the value as a float
                                value = float(row[column])
                            except ValueError:
                                self.stdout_write(
                                    f"Row {row_count}: Could not parse value to float {column}: {row[column]}. Creating with string_value."
                                )
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
        # Import legend functionality
        from .legend import get_legend_config

        for metric_type in MetricType.objects.filter(account=self.account):
            metric_type.legend_config = get_legend_config(metric_type, self.metric_type_scales[metric_type.code])
            metric_type.save()
