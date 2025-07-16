"""
Selective CSV file downloader for OpenHEXA datasets.

This module handles downloading only the required CSV files (metadata and dataset)
from OpenHEXA datasets to temporary files, eliminating the need for temporary directories.
"""

import tempfile
from pathlib import Path
import requests
from django.core.management.base import CommandError


class FileDownloader:
    """Handles selective downloading of files from OpenHEXA datasets."""

    def __init__(self, openhexa_client, stdout_writer=None):
        """Initialize the CSV downloader.

        Args:
            openhexa_client: OpenHEXA client instance for API calls
            stdout_writer: Optional writer for progress output (e.g., self.stdout.write)
        """
        self.openhexa_client = openhexa_client
        self.stdout_write = stdout_writer or print

    def download_csv_files(self, files):
        """Download metadata and dataset CSV files to temporary files.

        Args:
            files: List of file information dictionaries

        Returns:
            Tuple of (metadata_file_path, dataset_file_path)

        Raises:
            CommandError: If required CSV files are not found or cannot be downloaded
        """
        if not files:
            raise CommandError("No files available for download")

        # Find the required CSV files
        metadata_file_info = self._find_csv_file(files, "*metadata.csv")
        dataset_file_info = self._find_csv_file(files, "*dataset.csv")

        self.stdout_write(f"Found metadata file: {metadata_file_info['filename']}")
        self.stdout_write(f"Found dataset file: {dataset_file_info['filename']}")

        # Download to temporary files
        metadata_path = self._download_to_temp_file(metadata_file_info, "metadata")
        dataset_path = self._download_to_temp_file(dataset_file_info, "dataset")

        self.stdout_write(f"Downloaded metadata to: {metadata_path}")
        self.stdout_write(f"Downloaded dataset to: {dataset_path}")

        return metadata_path, dataset_path

    def _find_csv_file(self, files, pattern):
        pattern_suffix = pattern.replace("*", "")
        matching_files = [f for f in files if f["filename"].endswith(pattern_suffix)]

        if not matching_files:
            raise CommandError(f"No {pattern} file found in dataset")
        if len(matching_files) > 1:
            filenames = [f["filename"] for f in matching_files]
            raise CommandError(f"Multiple {pattern} files found: {filenames}")

        return matching_files[0]

    def _download_to_temp_file(self, file_info, file_type):
        try:
            download_url = self.openhexa_client.get_file_download_url(file_info["id"])
            if not download_url:
                raise CommandError(f"Could not get download URL for {file_type} file: {file_info['filename']}")

            # Create temporary file
            temp_file = tempfile.NamedTemporaryFile(suffix=".csv", prefix=f"openhexa_{file_type}_", delete=False)

            # Download file content
            response = requests.get(download_url, stream=True)
            response.raise_for_status()

            with temp_file as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)

            return temp_file.name

        except Exception as e:
            raise CommandError(f"Failed to download {file_type} file '{file_info['filename']}': {str(e)}")
