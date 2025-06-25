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

import requests

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from openhexa.toolbox.hexa import NotFound, OpenHEXA

from iaso.models import Account, MetricType, MetricValue, OrgUnit


class Command(BaseCommand):
    help = "Fetch a dataset from OpenHEXA workspace and import metrics data"

    def add_arguments(self, parser):
        parser.add_argument("--workspace_slug", type=str, help="The slug of the workspace containing the dataset")
        parser.add_argument("--dataset_slug", type=str, help="The slug of the dataset to fetch")
        parser.add_argument(
            "--download-dir",
            type=str,
            help="Directory to download files to (required)",
        )
        parser.add_argument("--account-id", type=int, help="Account ID for importing metrics (required)")
        parser.add_argument("--output", type=str, help="Output file path for metadata (optional)")

    def handle(self, *args, **options):
        workspace_slug = options["workspace_slug"]
        dataset_slug = options["dataset_slug"]
        download_dir = options["download_dir"]
        account_id = options["account_id"]

        if not workspace_slug:
            raise CommandError("--workspace_slug is required. Specify the workspace slug containing the dataset.")

        if not dataset_slug:
            raise CommandError("--dataset_slug is required. Specify the slug of the dataset to fetch.")

        if not download_dir:
            raise CommandError("--download-dir is required. Specify the directory to download files to.")

        if not account_id:
            raise CommandError("--account-id is required. Specify the account ID for importing metrics.")

        # Fetch Account instance
        try:
            account = Account.objects.get(id=account_id)
            self.stdout.write(f"Using account: {account.name} (ID: {account.id})")
        except Account.DoesNotExist:
            raise CommandError(f"Account with ID {account_id} not found.")

        server_url = os.getenv("OPENHEXA_URL")
        token = os.getenv("OPENHEXA_TOKEN")

        if not server_url:
            raise CommandError("OPENHEXA_SERVER_URL environment variable is required")

        if not token:
            raise CommandError("OPENHEXA_TOKEN environment variable is required")

        # Initialize OpenHEXA client
        hexa = OpenHEXA(server_url, token=token)
        self.stdout.write(f"Connecting to {server_url} with token authentication...")

        # List available datasets for easy debugging
        self.stdout.write(f'Checking available datasets in workspace "{workspace_slug}"...')
        datasets = self._list_workspace_datasets(hexa, workspace_slug)
        if datasets:
            self.stdout.write(f"Available datasets ({len(datasets)}):")
            for dataset in datasets:
                self.stdout.write(f"  - {dataset['dataset']['slug']} ({dataset['dataset']['name']})")
        else:
            self.stdout.write("No datasets found in this workspace (or insufficient permissions to list).")

        self.stdout.write(f'Fetching dataset "{dataset_slug}" from workspace "{workspace_slug}"...')
        dataset_link = self._get_dataset_link(hexa, workspace_slug, dataset_slug)

        if not dataset_link:
            raise CommandError(f'Dataset "{dataset_slug}" not found in workspace "{workspace_slug}".')

        dataset = dataset_link["dataset"]

        dataset_version = self._get_latest_version(hexa, dataset["id"])
        if not dataset_version:
            raise CommandError(f'No versions found for dataset "{dataset_slug}"')

        self.stdout.write(f"Using version: {dataset_version['name']}")

        # Get files for the version
        files = self._get_version_files(hexa, dataset_version["id"])

        # Download files
        self._download_files(hexa, files, download_dir)

        # Import metrics
        self.stdout.write(f"Starting metrics import for account {account.name} ({account.pk})...")
        self._import_metrics(download_dir, account)

        metadata = {"dataset": dataset, "version": dataset_version, "files": files}
        self.stdout.write(self._format_as_table(metadata))

    def _list_workspace_datasets(self, hexa, workspace_slug):
        """List all datasets in a workspace."""
        try:
            result = hexa.query(
                """
                query getWorkspaceDatasets($slug: String!, $page: Int, $perPage: Int) {
                    workspace(slug: $slug) {
                        datasets(page: $page, perPage: $perPage) {
                            items {
                                id
                                dataset {
                                    id
                                    slug
                                    name
                                }
                            }
                        }
                    }
                }
                """,
                {"slug": workspace_slug, "page": 1, "perPage": 100},
            )
            workspace = result.get("workspace")
            if workspace and workspace.get("datasets"):
                return workspace["datasets"]["items"]
            return []
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"Could not list datasets: {str(e)}"))
            return []

    def _get_dataset_link(self, hexa, workspace_slug, dataset_slug):
        """Fetch dataset link by slug from the workspace."""
        try:
            result = hexa.query(
                """
                query getDatasetLinkBySlug($workspaceSlug: String!, $datasetSlug: String!) {
                    datasetLinkBySlug(workspaceSlug: $workspaceSlug, datasetSlug: $datasetSlug) {
                        id
                        dataset {
                            id
                            slug
                            name
                            description
                            createdAt
                            updatedAt
                        }
                    }
                }
                """,
                {"workspaceSlug": workspace_slug, "datasetSlug": dataset_slug},
            )
            return result.get("datasetLinkBySlug")
        except Exception as e:
            print(e)
            if "not found" in str(e).lower():
                return None
            raise

    def _get_latest_version(self, hexa, dataset_id):
        """Get the latest version of a dataset."""
        try:
            result = hexa.query(
                """
                query getDatasetLatestVersion($id: ID!) {
                    dataset(id: $id) {
                        latestVersion {
                            id
                            name
                            changelog
                            createdAt
                            createdBy {
                                displayName
                            }
                        }
                    }
                }
                """,
                {"id": dataset_id},
            )
            dataset = result.get("dataset")
            return dataset.get("latestVersion") if dataset else None
        except Exception as e:
            if "not found" in str(e).lower():
                return None
            raise

    def _get_version_files(self, hexa, version_id):
        """Get all files for a dataset version."""
        try:
            result = hexa.query(
                """
                query getDatasetVersionFiles($id: ID!, $page: Int, $perPage: Int) {
                    datasetVersion(id: $id) {
                        files(page: $page, perPage: $perPage) {
                            items {
                                id
                                filename
                                contentType
                                size
                                createdAt
                                downloadUrl
                            }
                            totalItems
                        }
                    }
                }
                """,
                {"id": version_id, "page": 1, "perPage": 100},
            )
            version = result.get("datasetVersion")
            return version["files"]["items"] if version else []
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"Could not fetch files: {str(e)}"))
            return []

    def _download_files(self, hexa, files, download_dir):
        """Download all files in the dataset version."""
        if not files:
            self.stdout.write(self.style.WARNING("No files to download"))
            return

        download_path = Path(download_dir)

        self.stdout.write(f"Downloading {len(files)} files to {download_path}...")

        for file_info in files:
            try:
                # Get download URL for the file
                download_url = self._get_file_download_url(hexa, file_info["id"])
                if not download_url:
                    self.stdout.write(self.style.WARNING(f"Could not get download URL for {file_info['filename']}"))
                    continue

                # Download the file
                file_path = download_path / file_info["filename"]
                self._download_file(download_url, file_path, file_info)
                self.stdout.write(self.style.SUCCESS(f"Downloaded: {file_info['filename']}"))

            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Failed to download {file_info['filename']}: {str(e)}"))

    def _get_file_download_url(self, hexa, file_id):
        """Get download URL for a specific file."""
        try:
            result = hexa.query(
                """
                mutation prepareFileDownload($input: PrepareVersionFileDownloadInput!) {
                    prepareVersionFileDownload(input: $input) {
                        success
                        downloadUrl
                        errors
                    }
                }
                """,
                {"input": {"fileId": file_id}},
            )

            response = result.get("prepareVersionFileDownload")
            if response and response.get("success"):
                return response.get("downloadUrl")

            self.stdout.write(self.style.WARNING(f"Download preparation failed: {response.get('errors', [])}"))
            return None
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"Error getting download URL: {str(e)}"))
            return None

    def _download_file(self, url, file_path, file_info):
        """Download a file from URL to local path."""
        response = requests.get(url, stream=True)
        response.raise_for_status()

        with open(file_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)

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

    def _find_csv_files(self, download_dir):
        """Find metadata and dataset CSV files in the download directory."""
        download_path = Path(download_dir)

        # Find metadata file (*_metadata.csv)
        metadata_files = list(download_path.glob("*_metadata.csv"))
        if not metadata_files:
            raise CommandError("No metadata CSV file (*_metadata.csv) found in download directory")
        if len(metadata_files) > 1:
            raise CommandError(f"Multiple metadata CSV files found: {[f.name for f in metadata_files]}")

        # Find dataset file (*_dataset.csv)
        dataset_files = list(download_path.glob("*_dataset.csv"))
        if not dataset_files:
            raise CommandError("No dataset CSV file (*_dataset.csv) found in download directory")
        if len(dataset_files) > 1:
            raise CommandError(f"Multiple dataset CSV files found: {[f.name for f in dataset_files]}")

        return metadata_files[0], dataset_files[0]

    def _import_metrics(self, download_dir, account):
        """Import metrics from downloaded CSV files."""
        try:
            # Find the CSV files
            metadata_file, dataset_file = self._find_csv_files(download_dir)

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
