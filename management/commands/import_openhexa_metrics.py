"""
Django management command to fetch and download a dataset from OpenHEXA workspace.

Usage:
    python manage.py fetch_dataset <workspace_slug> <dataset_slug>

Environment variables required:
    OPENHEXA_SERVER_URL - OpenHEXA server URL
    OPENHEXA_USERNAME - Username (optional if using token)
    OPENHEXA_PASSWORD - Password (optional if using token)
    OPENHEXA_TOKEN - API token (optional if using username/password)
"""

import csv
import json
import os
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from iaso.models import Account, MetricType, MetricValue, OrgUnit
from .support.openhexa_client import OpenHEXAClient
from .support.file_downloader import FileDownloader


class Command(BaseCommand):
    help = "Fetch a dataset from OpenHEXA workspace and import metrics data"

    def add_arguments(self, parser):
        parser.add_argument("--workspace_slug", type=str, help="The slug of the workspace containing the dataset")
        parser.add_argument("--dataset_slug", type=str, help="The slug of the dataset to fetch")
        parser.add_argument("--account-id", type=int, help="Account ID for importing metrics (required)")

    def handle(self, *args, **options):
        workspace_slug = options["workspace_slug"]
        dataset_slug = options["dataset_slug"]
        account_id = options["account_id"]

        if not workspace_slug:
            raise CommandError("--workspace_slug is required. Specify the workspace slug containing the dataset.")

        if not dataset_slug:
            raise CommandError("--dataset_slug is required. Specify the slug of the dataset to fetch.")

        if not account_id:
            raise CommandError("--account-id is required. Specify the account ID for importing metrics.")

        # Fetch Account instance
        try:
            account = Account.objects.get(id=account_id)
            self.stdout.write(f"Using account: {account.name} (ID: {account.id})")
        except Account.DoesNotExist:
            raise CommandError(f"Account with ID {account_id} not found.")

        # Set download directory
        download_path = Path(f"/tmp/openhexa-metrics/{account_id}")
        download_path.mkdir(parents=True, exist_ok=True)
        self.stdout.write(f"Download directory: {download_path}")

        server_url = os.getenv("OPENHEXA_URL")
        token = os.getenv("OPENHEXA_TOKEN")

        if not server_url:
            raise CommandError("OPENHEXA_SERVER_URL environment variable is required")

        if not token:
            raise CommandError("OPENHEXA_TOKEN environment variable is required")

        # Initialize OpenHEXA client
        openhexa_client = OpenHEXAClient(server_url, token)
        self.stdout.write(f"Connecting to {server_url} with token authentication...")

        # List available datasets for easy debugging
        self.stdout.write(f'Checking available datasets in workspace "{workspace_slug}"...')
        datasets = openhexa_client.list_workspace_datasets(workspace_slug)
        if datasets:
            self.stdout.write(f"Available datasets ({len(datasets)}):")
            for dataset in datasets:
                self.stdout.write(f"  - {dataset['dataset']['slug']} ({dataset['dataset']['name']})")
        else:
            self.stdout.write("No datasets found in this workspace (or insufficient permissions to list).")

        self.stdout.write(f'Fetching dataset "{dataset_slug}" from workspace "{workspace_slug}"...')
        dataset_link = openhexa_client.get_dataset_link(workspace_slug, dataset_slug)

        if not dataset_link:
            raise CommandError(f'Dataset "{dataset_slug}" not found in workspace "{workspace_slug}".')

        dataset = dataset_link["dataset"]

        dataset_version = openhexa_client.get_latest_version(dataset["id"])
        if not dataset_version:
            raise CommandError(f'No versions found for dataset "{dataset_slug}"')

        self.stdout.write(f"Using version: {dataset_version['name']}")

        # Get files for the version
        files = openhexa_client.get_version_files(dataset_version["id"])

        # Download files
        file_downloader = FileDownloader(openhexa_client, download_path, self.stdout.write)
        file_downloader.download_dataset_files(files)
        metadata = {"dataset": dataset, "version": dataset_version, "files": files}
        self.stdout.write(self._format_as_table(metadata))

        # Import metrics
        self.stdout.write(f"Starting metrics import for account {account.name} ({account.pk})...")
        self._import_metrics(download_path, account)






    def _format_as_table(self, metadata):
        """Format dataset information as a readable table."""
        dataset = metadata["dataset"]
        version = metadata["version"]
        files = metadata["files"]

        lines = [
            "Dataset Information",
            "=" * 50,
            f"ID:          {dataset.get('id', 'N/A')}",
            f"Slug:        {dataset.get('slug', 'N/A')}",
            f"Name:        {dataset.get('name', 'N/A')}",
            f"Description: {dataset.get('description', 'N/A')}",
            f"Created:     {dataset.get('createdAt', 'N/A')}",
            f"Updated:     {dataset.get('updatedAt', 'N/A')}",
            "",
            "Version Information",
            "=" * 50,
            f"ID:          {version.get('id', 'N/A')}",
            f"Name:        {version.get('name', 'N/A')}",
            f"Changelog:   {version.get('changelog', 'N/A')}",
            f"Created:     {version.get('createdAt', 'N/A')}",
            f"Created By:  {(version.get('createdBy') or {}).get('displayName', 'N/A')}",
            "",
            f"Files ({len(files)})",
            "=" * 50,
        ]

        for file_info in files:
            size_mb = int(file_info.get("size", 0)) / (1024 * 1024) if file_info.get("size") else 0
            lines.extend(
                [
                    f"• {file_info.get('filename', 'N/A')}",
                    f"  Type: {file_info.get('contentType', 'N/A')}",
                    f"  Size: {size_mb:.2f} MB",
                    f"  Created: {file_info.get('createdAt', 'N/A')}",
                    "",
                ]
            )

        return "\n".join(lines)

    def _find_csv_files(self, download_path):
        """Find metadata and dataset CSV files in the download directory."""
        # Find metadata file (*metadata.csv)
        metadata_files = list(download_path.glob("*metadata.csv"))
        if not metadata_files:
            raise CommandError("No metadata CSV file (*metadata.csv) found in download directory")
        if len(metadata_files) > 1:
            raise CommandError(f"Multiple metadata CSV files found: {[f.name for f in metadata_files]}")

        # Find dataset file (*dataset.csv)
        dataset_files = list(download_path.glob("*dataset.csv"))
        if not dataset_files:
            raise CommandError("No dataset CSV file (*dataset.csv) found in download directory")
        if len(dataset_files) > 1:
            raise CommandError(f"Multiple dataset CSV files found: {[f.name for f in dataset_files]}")

        return metadata_files[0], dataset_files[0]

    def _import_metrics(self, download_path, account):
        """Import metrics from downloaded CSV files."""
        try:
            # Find the CSV files
            metadata_file, dataset_file = self._find_csv_files(download_path)

            self.stdout.write(f"Using metadata file: {metadata_file.name}")
            self.stdout.write(f"Using dataset file: {dataset_file.name}")

            # Import the metrics
            self._process_metrics_import(metadata_file, dataset_file, account)

        except Exception as e:
            raise CommandError(f"Failed to import metrics: {str(e)}")

    def _process_metrics_import(self, metadata_file, dataset_file, account):
        """Process the actual metrics import."""
        # Validate CSV files first
        self._validate_csv_files(metadata_file, dataset_file)

        self.stdout.write("Clearing existing metrics...")
        MetricValue.objects.filter(metric_type__account=account).delete()
        MetricType.objects.filter(account=account).delete()

        self.stdout.write("Creating MetricTypes from metadata file...")
        metric_types = {}

        with open(metadata_file, newline="", encoding="utf-8") as metafile:
            metareader = csv.DictReader(metafile)
            for row in metareader:
                metric_type = MetricType.objects.create(
                    account=account,
                    name=row["LABEL"],
                    code=row["VARIABLE"],
                    description=row["DESCRIPTION"],
                    source=row["SOURCE"],
                    units=row["UNITS"],
                    comments=row["COMMENTS"],
                    category=row["CATEGORY"],
                    unit_symbol=row["UNIT_SYMBOL"],
                )
                self.stdout.write(self.style.SUCCESS(f"Created metric: {metric_type.name}"))
                metric_types[metric_type.code] = metric_type

        self.stdout.write("Reading values from dataset file...")
        with open(dataset_file, newline="", encoding="utf-8") as csvfile:
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
                            self.stdout.write(
                                self.style.WARNING(
                                    f"Row {row_count}: OrgUnit not found for source_ref: {row['ADM2_ID']}"
                                )
                            )
                            continue

                        # Create MetricValue for each metric type
                        for column, metric_type in metric_types.items():
                            if column not in row:
                                continue
                            if not row[column]:
                                continue

                            try:
                                # Parse the value as a fload and round to max 3 behind the comma
                                value = round(float(row[column]), 3)

                            except ValueError:
                                self.stdout.write(
                                    self.style.WARNING(f"Row {row_count}: Invalid value for {column}: {row[column]}")
                                )
                                continue

                            # Create the MetricValue
                            MetricValue.objects.create(
                                metric_type=metric_type,
                                org_unit=org_unit,
                                value=value,
                            )
                            value_count += 1

                    self.stdout.write(f"Processed {row_count} rows, created {value_count} metric values")

            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Error during import, rolling back transaction: {str(e)}"))
                raise

        self.stdout.write("Adding threshold scales...")
        # Import legend functionality here
        from .support.legend import get_legend_config, get_legend_type

        for metric_type in MetricType.objects.filter(account=account):
            metric_type.legend_config = get_legend_config(metric_type)
            metric_type.legend_type = get_legend_type(metric_type)
            metric_type.save()

        self.stdout.write(self.style.SUCCESS("Metrics import completed successfully!"))

    def _validate_csv_files(self, metadata_file, dataset_file):
        """Validate that CSV files have the expected structure."""
        # Validate metadata file
        required_metadata_columns = [
            "VARIABLE",
            "LABEL",
            "DESCRIPTION",
            "SOURCE",
            "UNITS",
            "COMMENTS",
            "CATEGORY",
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

        self.stdout.write("CSV file validation passed")
