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

import json
import os

from pathlib import Path

import requests

from django.core.management.base import BaseCommand, CommandError
from openhexa.toolbox.hexa import NotFound, OpenHEXA


class Command(BaseCommand):
    help = "Fetch a specific dataset from an OpenHEXA workspace"

    def add_arguments(self, parser):
        parser.add_argument("--workspace_slug", type=str, help="The slug of the workspace containing the dataset")
        parser.add_argument("--dataset_slug", type=str, help="The slug of the dataset to fetch")
        parser.add_argument(
            "--download-dir",
            type=str,
            help="Directory to download files to (required)",
        )
        parser.add_argument("--output", type=str, help="Output file path for metadata (optional)")

    def handle(self, *args, **options):
        workspace_slug = options["workspace_slug"]
        dataset_slug = options["dataset_slug"]
        download_dir = options["download_dir"]

        if not workspace_slug:
            raise CommandError("--workspace_slug is required. Specify the workspace slug containing the dataset.")

        if not dataset_slug:
            raise CommandError("--dataset_slug is required. Specify the slug of the dataset to fetch.")

        if not download_dir:
            raise CommandError("--download-dir is required. Specify the directory to download files to.")

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
