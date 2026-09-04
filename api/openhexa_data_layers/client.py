"""Fetch the SNT data-layer definitions file from an OpenHexa dataset."""

import requests

from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _

from plugins.snt_malaria.management.commands.support.openhexa_client import OpenHEXAClient

from .jsonc import loads_jsonc


METADATA_FILENAME = "SNT_metadata.json"
DOWNLOAD_TIMEOUT_SECONDS = 30


def fetch_data_layer_metadata(
    openhexa_url: str,
    openhexa_token: str,
    workspace_slug: str,
    dataset_slug: str,
    filename: str = METADATA_FILENAME,
) -> dict:
    client = OpenHEXAClient(openhexa_url, openhexa_token)

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
    match = next((file for file in files if file.get("filename") == filename), None)
    if not match:
        raise ValidationError(
            _("File '{filename}' was not found in OpenHexa dataset '{slug}'.").format(
                filename=filename, slug=dataset_slug
            )
        )

    download_url = client.get_file_download_url(match["id"])
    if not download_url:
        raise ValidationError(_("Could not get a download URL for '{filename}'.").format(filename=filename))

    response = requests.get(download_url, timeout=DOWNLOAD_TIMEOUT_SECONDS)
    response.raise_for_status()

    # Storage download URLs rarely declare a charset; decode explicitly so accented
    # (French) labels are not mangled by requests' fallback encoding.
    try:
        return loads_jsonc(response.content.decode("utf-8"))
    except (ValueError, UnicodeDecodeError) as error:
        raise ValidationError(_("File '{filename}' is not valid JSON: {error}").format(filename=filename, error=error))
