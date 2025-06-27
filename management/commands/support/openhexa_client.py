"""
OpenHEXA API client for dataset operations.

This module provides a clean interface for interacting with the OpenHEXA API,
including workspace and dataset queries, file listings, and authentication.
"""

from openhexa.toolbox.hexa import OpenHEXA


class OpenHEXAClient:
    """Client for OpenHEXA API interactions."""

    def __init__(self, server_url, token):
        """Initialize the OpenHEXA client.

        Args:
            server_url: The OpenHEXA server URL
            token: API authentication token
        """
        self.hexa = OpenHEXA(server_url, token=token)
        self.server_url = server_url

    def list_workspace_datasets(self, workspace_slug):
        """List all datasets in a workspace.

        Args:
            workspace_slug: The slug of the workspace

        Returns:
            List of dataset items or empty list if none found/error
        """
        try:
            result = self.hexa.query(
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
                                    description
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
        except Exception:
            return []

    def get_dataset_link(self, workspace_slug, dataset_slug):
        """Fetch dataset link by slug from the workspace.

        Args:
            workspace_slug: The workspace slug
            dataset_slug: The dataset slug

        Returns:
            Dataset link information or None if not found
        """
        try:
            result = self.hexa.query(
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

    def get_latest_version(self, dataset_id):
        """Get the latest version of a dataset.

        Args:
            dataset_id: The dataset ID

        Returns:
            Latest version information or None if not found
        """
        try:
            result = self.hexa.query(
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

    def get_version_files(self, version_id):
        """Get all files for a dataset version.

        Args:
            version_id: The dataset version ID

        Returns:
            List of file information or empty list if error
        """
        try:
            result = self.hexa.query(
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
        except Exception:
            return []

    def get_file_download_url(self, file_id):
        """Get download URL for a specific file.

        Args:
            file_id: The file ID

        Returns:
            Download URL string or None if error
        """
        try:
            result = self.hexa.query(
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
            return None
        except Exception:
            return None
