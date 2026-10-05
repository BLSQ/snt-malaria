"""Download files from the account's OpenHexa datasets."""

import logging

import requests

from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _

from iaso.utils.openhexa import get_openhexa_config
from plugins.snt_malaria.api.openhexa_data_layers.constants import (
    CONFIG_DATASET_KEY,
    METADATA_DATASET_KEY,
    METADATA_FILENAME_KEY,
)
from plugins.snt_malaria.api.openhexa_data_layers.jsonc import loads_jsonc
from plugins.snt_malaria.management.commands.support.openhexa_client import OpenHEXAClient


logger = logging.getLogger(__name__)

DEFAULT_METADATA_FILENAME = "SNT_metadata_trimmed.json"
CONFIG_FILENAME = "SNT_config.json"
DOWNLOAD_TIMEOUT_SECONDS = 30


def _required_config_value(workspace, key: str) -> str:
    value = (workspace.config or {}).get(key)
    if not value:
        raise ValidationError(_("The OpenHexa workspace configuration is missing the '{key}' key.").format(key=key))
    return value


def resolve_config_dataset(account) -> tuple:
    """``(openhexa_url, token, workspace_slug, config_dataset_slug)`` for the account.

    Raises ``ValidationError`` if OpenHexa is not configured or the workspace config is
    missing the ``snt_configuration_dataset`` key.
    """
    openhexa_url, openhexa_token, workspace_slug, workspace = get_openhexa_config(account)
    dataset_slug = _required_config_value(workspace, CONFIG_DATASET_KEY)
    return openhexa_url, openhexa_token, workspace_slug, dataset_slug


def resolve_metadata_file(account) -> tuple:
    """``(openhexa_url, token, workspace_slug, metadata_dataset_slug, metadata_filename)`` for the account.

    The dataset comes from the ``snt_metadata_dataset`` workspace config key (required); the
    filename from ``snt_metadata_filename`` if set, else ``DEFAULT_METADATA_FILENAME``.
    Shared by the list view, the import serializer and the import task.
    """
    openhexa_url, openhexa_token, workspace_slug, workspace = get_openhexa_config(account)
    dataset_slug = _required_config_value(workspace, METADATA_DATASET_KEY)
    filename = (workspace.config or {}).get(METADATA_FILENAME_KEY) or DEFAULT_METADATA_FILENAME
    return openhexa_url, openhexa_token, workspace_slug, dataset_slug, filename


def _resolve_version_files(client: OpenHEXAClient, workspace_slug: str, dataset_slug: str) -> list:
    """dataset link -> latest version -> the list of files it contains."""
    logger.info("OpenHexa: resolving dataset '%s' (workspace '%s')", dataset_slug, workspace_slug)

    dataset_link = client.get_dataset_link(workspace_slug, dataset_slug)
    if not dataset_link:
        raise ValidationError(
            _("OpenHexa dataset '{slug}' was not found in workspace '{workspace}'.").format(
                slug=dataset_slug, workspace=workspace_slug
            )
        )

    version = client.get_latest_version(dataset_link["dataset"]["id"])
    if not version:
        raise ValidationError(_("OpenHexa dataset '{slug}' has no versions.").format(slug=dataset_slug))

    files = client.get_version_files(version["id"])
    logger.info(
        "OpenHexa: dataset '%s' latest version '%s' (id %s) - files: %s",
        dataset_slug,
        version.get("name"),
        version.get("id"),
        [file.get("filename") for file in files],
    )
    return files


def _download_file(client: OpenHEXAClient, files: list, filename: str, dataset_slug: str) -> bytes:
    match = next((file for file in files if file.get("filename") == filename), None)
    if not match:
        raise ValidationError(
            _("File '{filename}' was not found in OpenHexa dataset '{slug}'.").format(
                filename=filename, slug=dataset_slug
            )
        )

    # Always mint a fresh signed URL via prepareFileDownload; the one on the listing item
    # can be short-lived / stale by the time a background task gets here.
    download_url = client.get_file_download_url(match["id"])
    if not download_url:
        raise ValidationError(_("Could not get a download URL for '{filename}'.").format(filename=filename))

    response = requests.get(download_url, timeout=DOWNLOAD_TIMEOUT_SECONDS)
    response.raise_for_status()
    logger.info("OpenHexa: downloaded '%s' (%d bytes)", filename, len(response.content))
    return response.content


def download_dataset_file(
    openhexa_url: str, openhexa_token: str, workspace_slug: str, dataset_slug: str, filename: str
) -> bytes:
    """Return the raw bytes of ``filename`` from the latest version of ``dataset_slug``."""
    client = OpenHEXAClient(openhexa_url, openhexa_token)
    files = _resolve_version_files(client, workspace_slug, dataset_slug)
    return _download_file(client, files, filename, dataset_slug)


def _parse_jsonc(filename: str, content: bytes) -> dict:
    # Storage download URLs rarely declare a charset; decode explicitly so accented
    # (French) labels are not mangled by requests' fallback encoding.
    try:
        return loads_jsonc(content.decode("utf-8"))
    except (ValueError, UnicodeDecodeError) as error:
        raise ValidationError(_("File '{filename}' is not valid JSON: {error}").format(filename=filename, error=error))


def fetch_dataset_json(
    openhexa_url: str, openhexa_token: str, workspace_slug: str, dataset_slug: str, filename: str
) -> dict:
    """Download and JSONC-parse ``filename`` from the latest version of ``dataset_slug``."""
    return _parse_jsonc(
        filename, download_dataset_file(openhexa_url, openhexa_token, workspace_slug, dataset_slug, filename)
    )
