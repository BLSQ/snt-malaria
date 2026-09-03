"""Download files from the account's OpenHexa datasets."""

import logging

import requests

from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _

from plugins.snt_malaria.management.commands.support.openhexa_client import OpenHEXAClient

from .jsonc import loads_jsonc


logger = logging.getLogger(__name__)

METADATA_FILENAME = "SNT_metadata.json"
CONFIG_FILENAME = "SNT_config.json"
DOWNLOAD_TIMEOUT_SECONDS = 30


def download_dataset_file(
    openhexa_url: str, openhexa_token: str, workspace_slug: str, dataset_slug: str, filename: str
) -> bytes:
    """Return the raw bytes of ``filename`` from the latest version of ``dataset_slug``.

    Walks dataset link -> latest version -> version files -> signed download URL -> GET.
    """
    logger.info("OpenHexa: fetching '%s' from dataset '%s' (workspace '%s')", filename, dataset_slug, workspace_slug)
    client = OpenHEXAClient(openhexa_url, openhexa_token)

    dataset_link = client.get_dataset_link(workspace_slug, dataset_slug)
    if not dataset_link:
        raise ValidationError(
            _("OpenHexa dataset '{slug}' was not found in workspace '{workspace}'.").format(
                slug=dataset_slug, workspace=workspace_slug
            )
        )
    dataset_id = dataset_link["dataset"]["id"]
    logger.info("OpenHexa: dataset '%s' resolved to id %s", dataset_slug, dataset_id)

    version = client.get_latest_version(dataset_id)
    if not version:
        logger.warning("OpenHexa: dataset '%s' (id %s) has no versions", dataset_slug, dataset_id)
        raise ValidationError(_("OpenHexa dataset '{slug}' has no versions.").format(slug=dataset_slug))
    logger.info(
        "OpenHexa: latest version of '%s' = '%s' (id %s, created %s)",
        dataset_slug,
        version.get("name"),
        version.get("id"),
        version.get("createdAt"),
    )

    files = client.get_version_files(version["id"])
    logger.info(
        "OpenHexa: version '%s' contains %d file(s): %s",
        version.get("name"),
        len(files),
        [file.get("filename") for file in files],
    )
    match = next((file for file in files if file.get("filename") == filename), None)
    if not match:
        raise ValidationError(
            _("File '{filename}' was not found in OpenHexa dataset '{slug}'.").format(
                filename=filename, slug=dataset_slug
            )
        )
    logger.info("OpenHexa: matched file '%s' (id %s, size %s bytes)", filename, match.get("id"), match.get("size"))

    download_url = client.get_file_download_url(match["id"])
    if not download_url:
        raise ValidationError(_("Could not get a download URL for '{filename}'.").format(filename=filename))

    response = requests.get(download_url, timeout=DOWNLOAD_TIMEOUT_SECONDS)
    response.raise_for_status()
    logger.info("OpenHexa: downloaded '%s' (%d bytes)", filename, len(response.content))
    return response.content


def fetch_dataset_json(
    openhexa_url: str, openhexa_token: str, workspace_slug: str, dataset_slug: str, filename: str
) -> dict:
    """Download ``filename`` from the latest version of ``dataset_slug`` and parse it as JSONC.

    Callers pass ``METADATA_FILENAME`` (data layer definitions) or ``CONFIG_FILENAME``
    (dataset identifiers + country code) - both live in the same configuration dataset.
    """
    content = download_dataset_file(openhexa_url, openhexa_token, workspace_slug, dataset_slug, filename)
    # Storage download URLs rarely declare a charset; decode explicitly so accented
    # (French) labels are not mangled by requests' fallback encoding.
    try:
        return loads_jsonc(content.decode("utf-8"))
    except (ValueError, UnicodeDecodeError) as error:
        raise ValidationError(_("File '{filename}' is not valid JSON: {error}").format(filename=filename, error=error))
