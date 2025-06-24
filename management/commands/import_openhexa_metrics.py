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
        parser.add_argument("--download", action="store_true", help="Download dataset files to local directory")
        parser.add_argument(
            "--download-dir",
            type=str,
            default="./datasets",
            help="Directory to download files to (default: ./datasets)",
        )
        parser.add_argument(
            "--format", choices=["json", "table"], default="json", help="Output format for metadata (default: json)"
        )
        parser.add_argument("--output", type=str, help="Output file path for metadata (optional)")

    def handle(self, *args, **options):
        workspace_slug = options["workspace_slug"]
        dataset_slug = options["dataset_slug"]
        should_download = options["download"]
        download_dir = options["download_dir"]
        output_format = options["format"]
        output_file = options.get("output")

        # Get credentials from environment
        server_url = os.getenv("OPENHEXA_URL")
        username = os.getenv("OPENHEXA_USERNAME")
        password = os.getenv("OPENHEXA_PASSWORD")
        token = os.getenv("OPENHEXA_TOKEN")

        if not server_url:
            raise CommandError("OPENHEXA_SERVER_URL environment variable is required")

        if not token and not (username and password):
            raise CommandError(
                "Either OPENHEXA_TOKEN or both OPENHEXA_USERNAME and OPENHEXA_PASSWORD "
                "environment variables are required"
            )

        try:
            # Initialize OpenHEXA client
            if token:
                hexa = OpenHEXA(server_url, token=token)
                self.stdout.write(f"Connecting to {server_url} with token authentication...")
            else:
                hexa = OpenHEXA(server_url, username=username, password=password)
                self.stdout.write(f"Connecting to {server_url} with credentials...")

            # Fetch the dataset link
            self.stdout.write(f'Fetching dataset "{dataset_slug}" from workspace "{workspace_slug}"...')

            dataset_link = self._get_dataset_link(hexa, workspace_slug, dataset_slug)

            if not dataset_link:
                raise CommandError(f'Dataset "{dataset_slug}" not found in workspace "{workspace_slug}"')

            dataset = dataset_link["dataset"]

            dataset_version = self._get_latest_version(hexa, dataset["id"])
            if not dataset_version:
                raise CommandError(f'No versions found for dataset "{dataset_slug}"')

            self.stdout.write(f"Using version: {dataset_version['name']}")

            # Get files for the version
            files = self._get_version_files(hexa, dataset_version["id"])

            # Download files if requested
            if should_download:
                self._download_files(hexa, files, download_dir, workspace_slug, dataset_slug, dataset_version["name"])

            # Prepare metadata output
            metadata = {"dataset": dataset, "version": dataset_version, "files": files}

            # Format and output metadata
            if output_format == "json":
                output_data = json.dumps(metadata, indent=2)
            else:  # table format
                output_data = self._format_as_table(metadata)

            if output_file:
                with open(output_file, "w") as f:
                    f.write(output_data)
                self.stdout.write(self.style.SUCCESS(f"Dataset metadata saved to {output_file}"))
            else:
                self.stdout.write(output_data)

        except NotFound as e:
            raise CommandError(str(e))
        except Exception as e:
            raise CommandError(f"Error fetching dataset: {str(e)}")

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

    def _download_files(self, hexa, files, download_dir, workspace_slug, dataset_slug, version_name):
        """Download all files in the dataset version."""
        if not files:
            self.stdout.write(self.style.WARNING("No files to download"))
            return

        # Create download directory structure
        download_path = Path(download_dir) / workspace_slug / dataset_slug / version_name
        download_path.mkdir(parents=True, exist_ok=True)

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
            else:
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
            f"Created By:  {version.get('createdBy', {}).get('displayName', 'N/A')}",
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
