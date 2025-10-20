"""
Django management command to import metrics from OpenHEXA datasets.

Downloads dataset files from OpenHEXA workspace and imports metrics data
into Django models for the specified account.

Usage:
    python manage.py import_openhexa_metrics --account-id <id>

The workspace slug, dataset slug, server URL, and token are automatically
retrieved from the OpenHEXAWorkspace and OpenHEXAInstance models associated
with the account.
"""

import os

from django.core.management.base import BaseCommand, CommandError

from iaso.models import Account
from iaso.models.openhexa import OpenHEXAWorkspace

from .support.file_downloader import FileDownloader
from .support.metrics_importer import MetricsImporter
from .support.openhexa_client import OpenHEXAClient


class Command(BaseCommand):
    help = "Fetch a dataset from OpenHEXA workspace and import metrics data"

    def add_arguments(self, parser):
        parser.add_argument("--account-id", type=int, help="Account ID for importing metrics (required)")

    def handle(self, *args, **options):
        # Validate arguments and get OpenHEXA configuration
        account, workspace, workspace_slug, dataset_slug = self._validate_arguments(options)
        openhexa_client = self._setup_openhexa_client(workspace.openhexa_instance)

        # Orchestrate the full process
        self._list_available_datasets(openhexa_client, workspace_slug)
        dataset_info = self._fetch_dataset_info(openhexa_client, workspace_slug, dataset_slug)
        self._display_dataset_summary(dataset_info, dataset_info["files"])

        # Download CSV files and ensure cleanup
        file_downloader = FileDownloader(openhexa_client, self.stdout.write)
        metadata_path, dataset_path = file_downloader.download_csv_files(dataset_info["files"])
        try:
            self._import_metrics(account, metadata_path, dataset_path)
        finally:
            # Clean up temporary files
            self._cleanup_temp_file(metadata_path)
            self._cleanup_temp_file(dataset_path)

    def _validate_arguments(self, options):
        account_id = options["account_id"]

        if not account_id:
            raise CommandError("--account-id is required. Specify the account ID for importing metrics.")

        # Fetch Account instance
        try:
            account = Account.objects.get(id=account_id)
            self.stdout.write(f"Using account: {account.name} (ID: {account.id})")
        except Account.DoesNotExist:
            raise CommandError(f"Account with ID {account_id} not found.")

        # Fetch OpenHEXAWorkspace for this account
        try:
            workspace = OpenHEXAWorkspace.objects.select_related("openhexa_instance").get(account=account)
            self.stdout.write(
                f"Found OpenHEXA workspace: {workspace.slug} (Instance: {workspace.openhexa_instance.name})"
            )
        except OpenHEXAWorkspace.DoesNotExist:
            raise CommandError(
                f"No OpenHEXA workspace configured for account '{account.name}' (ID: {account_id}). "
                f"Please configure an OpenHEXA workspace for this account in the admin interface."
            )
        except OpenHEXAWorkspace.MultipleObjectsReturned:
            raise CommandError(
                f"Multiple OpenHEXA workspaces found for account '{account.name}' (ID: {account_id}). "
                f"Please ensure only one workspace is configured per account."
            )

        # Get workspace slug
        workspace_slug = workspace.slug
        if not workspace_slug:
            raise CommandError(
                f"OpenHEXA workspace for account '{account.name}' has no slug configured. "
                f"Please update the workspace configuration in the admin interface."
            )

        # Get dataset slug from workspace config
        if not workspace.config:
            raise CommandError(
                f"OpenHEXA workspace '{workspace_slug}' has no configuration. "
                f"Please add configuration with 'snt_results_dataset' key in the admin interface."
            )

        dataset_slug = workspace.config.get("snt_results_dataset")
        if not dataset_slug:
            raise CommandError(
                f"OpenHEXA workspace '{workspace_slug}' configuration is missing 'snt_results_dataset' key. "
                f"Expected format: {{\"snt_results_dataset\": \"dataset-slug\"}}"
            )

        self.stdout.write(f"Using workspace slug: {workspace_slug}")
        self.stdout.write(f"Using dataset slug: {dataset_slug}")

        return account, workspace, workspace_slug, dataset_slug

    def _setup_openhexa_client(self, openhexa_instance):
        server_url = openhexa_instance.url
        token = openhexa_instance.token

        if not server_url:
            raise CommandError(
                f"OpenHEXA instance '{openhexa_instance.name}' has no URL configured. "
                f"Please update the instance configuration in the admin interface."
            )
        if not token:
            raise CommandError(
                f"OpenHEXA instance '{openhexa_instance.name}' has no token configured. "
                f"Please update the instance configuration in the admin interface."
            )

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
            self.stdout.write(
                self.style.WARNING("No datasets found in this workspace (or insufficient permissions to list).")
            )

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

    def _display_dataset_summary(self, dataset_info, files):
        metadata = {"dataset": dataset_info["dataset"], "version": dataset_info["version"], "files": files}
        self.stdout.write(self._format_as_table(metadata))

    def _import_metrics(self, account, metadata_path, dataset_path):
        self.stdout.write(f"Starting metrics import for account {account.name} ({account.pk})...")
        metrics_importer = MetricsImporter(account, self.style, self.stdout.write)
        metrics_importer.import_metrics(metadata_path, dataset_path)

    def _cleanup_temp_file(self, file_path):
        try:
            if os.path.exists(file_path):
                os.unlink(file_path)
                self.stdout.write(f"Cleaned up temporary metadata file: {file_path}")
        except Exception as e:
            self.stdout.write(f"Warning: Could not clean up metadata file {file_path}: {e}")

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
