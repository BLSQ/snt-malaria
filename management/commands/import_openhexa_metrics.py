"""
Django management command to import metrics from OpenHEXA datasets.

Downloads dataset files from OpenHEXA workspace and imports metrics data
into Django models for the specified account.

Usage:
    python manage.py import_openhexa_metrics --workspace_slug <slug> --dataset_slug <slug> --account-id <id>

Environment variables required:
    OPENHEXA_URL - OpenHEXA server URL
    OPENHEXA_TOKEN - API authentication token
"""

import os

from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from iaso.models import Account

from .support.file_downloader import FileDownloader
from .support.metrics_importer import MetricsImporter
from .support.openhexa_client import OpenHEXAClient


class Command(BaseCommand):
    help = "Fetch a dataset from OpenHEXA workspace and import metrics data"

    def add_arguments(self, parser):
        parser.add_argument("--workspace_slug", type=str, help="The slug of the workspace containing the dataset")
        parser.add_argument("--dataset_slug", type=str, help="The slug of the dataset to fetch")
        parser.add_argument("--account-id", type=int, help="Account ID for importing metrics (required)")

    def handle(self, *args, **options):
        # Validate arguments and environment
        workspace_slug, dataset_slug, account = self._validate_arguments(options)
        download_path = self._setup_download_directory(account.id)
        openhexa_client = self._setup_openhexa_client()

        # Orchestrate the full process
        self._list_available_datasets(openhexa_client, workspace_slug)
        dataset_info = self._fetch_dataset_info(openhexa_client, workspace_slug, dataset_slug)
        files = self._download_dataset_files(openhexa_client, dataset_info, download_path)
        self._display_dataset_summary(dataset_info, files)
        self._import_metrics(account, download_path)

    def _validate_arguments(self, options):
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
            return workspace_slug, dataset_slug, account
        except Account.DoesNotExist:
            raise CommandError(f"Account with ID {account_id} not found.")

    def _setup_download_directory(self, account_id):
        download_path = Path(f"/tmp/openhexa-metrics/{account_id}")
        download_path.mkdir(parents=True, exist_ok=True)
        self.stdout.write(f"Download directory: {download_path}")
        return download_path

    def _setup_openhexa_client(self):
        server_url = os.getenv("OPENHEXA_URL")
        token = os.getenv("OPENHEXA_TOKEN")

        if not server_url:
            raise CommandError("OPENHEXA_URL environment variable is required")
        if not token:
            raise CommandError("OPENHEXA_TOKEN environment variable is required")

        self.stdout.write(f"Connecting to {server_url} with token authentication...")
        return OpenHEXAClient(server_url, token)

    def _list_available_datasets(self, openhexa_client, workspace_slug):
        self.stdout.write(f'Checking available datasets in workspace "{workspace_slug}"...')
        datasets = openhexa_client.list_workspace_datasets(workspace_slug)
        if datasets:
            self.stdout.write(f"Available datasets ({len(datasets)}):")
            for dataset in datasets:
                self.stdout.write(f"  - {dataset['dataset']['slug']} ({dataset['dataset']['name']})")
        else:
            self.stdout.write("No datasets found in this workspace (or insufficient permissions to list).")

    def _fetch_dataset_info(self, openhexa_client, workspace_slug, dataset_slug):
        self.stdout.write(f'Fetching dataset "{dataset_slug}" from workspace "{workspace_slug}"...')
        dataset_link = openhexa_client.get_dataset_link(workspace_slug, dataset_slug)

        if not dataset_link:
            raise CommandError(f'Dataset "{dataset_slug}" not found in workspace "{workspace_slug}".')

        dataset = dataset_link["dataset"]
        dataset_version = openhexa_client.get_latest_version(dataset["id"])
        if not dataset_version:
            raise CommandError(f'No versions found for dataset "{dataset_slug}"')

        self.stdout.write(f"Using version: {dataset_version['name']}")
        files = openhexa_client.get_version_files(dataset_version["id"])

        return {"dataset": dataset, "version": dataset_version, "files": files}

    def _download_dataset_files(self, openhexa_client, dataset_info, download_path):
        file_downloader = FileDownloader(openhexa_client, download_path, self.stdout.write)
        file_downloader.download_dataset_files(dataset_info["files"])
        return dataset_info["files"]

    def _display_dataset_summary(self, dataset_info, files):
        metadata = {"dataset": dataset_info["dataset"], "version": dataset_info["version"], "files": files}
        self.stdout.write(self._format_as_table(metadata))

    def _import_metrics(self, account, download_path):
        self.stdout.write(f"Starting metrics import for account {account.name} ({account.pk})...")
        metrics_importer = MetricsImporter(account, download_path, self.stdout.write)
        metrics_importer.import_metrics()

    def _format_as_table(self, metadata):
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
