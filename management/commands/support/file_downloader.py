"""
File downloader for OpenHEXA datasets.

This module handles downloading files from OpenHEXA datasets to local storage,
including progress reporting and error handling.
"""

from pathlib import Path
import requests


class FileDownloader:
    """Handles downloading files from OpenHEXA datasets."""

    def __init__(self, openhexa_client, download_path, stdout_writer=None):
        """Initialize the file downloader.

        Args:
            openhexa_client: OpenHEXA client instance for API calls
            download_path: Path object for download directory
            stdout_writer: Optional writer for progress output (e.g., self.stdout.write)
        """
        self.openhexa_client = openhexa_client
        self.download_path = Path(download_path)
        self.stdout_write = stdout_writer or print

        # Ensure download directory exists
        self.download_path.mkdir(parents=True, exist_ok=True)

    def download_dataset_files(self, files):
        """Download all files in the dataset version.

        Args:
            files: List of file information dictionaries

        Returns:
            Number of successfully downloaded files
        """
        if not files:
            self.stdout_write("WARNING: No files to download")
            return 0

        self.stdout_write(f"Downloading {len(files)} files to {self.download_path}...")

        success_count = 0
        for file_info in files:
            try:
                if self._download_single_file(file_info):
                    success_count += 1
                    self.stdout_write(f"SUCCESS: Downloaded: {file_info['filename']}")
                else:
                    self.stdout_write(f"WARNING: Could not get download URL for {file_info['filename']}")

            except Exception as e:
                self.stdout_write(f"ERROR: Failed to download {file_info['filename']}: {str(e)}")

        self.stdout_write(f"Downloaded {success_count}/{len(files)} files successfully")
        return success_count

    def _download_single_file(self, file_info):
        """Download a single file.

        Args:
            file_info: File information dictionary

        Returns:
            True if successful, False otherwise
        """
        # Get download URL for the file
        download_url = self.openhexa_client.get_file_download_url(file_info["id"])
        if not download_url:
            return False

        # Download the file
        file_path = self.download_path / file_info["filename"]
        self._download_file_from_url(download_url, file_path, file_info)
        return True

    def _download_file_from_url(self, url, file_path, file_info):
        """Download a file from URL to local path.

        Args:
            url: Download URL
            file_path: Local file path
            file_info: File information for error reporting
        """
        response = requests.get(url, stream=True)
        response.raise_for_status()

        with open(file_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)

    def get_download_path(self):
        """Get the download directory path."""
        return self.download_path
