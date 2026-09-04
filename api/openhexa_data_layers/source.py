"""Resolve a data layer's ``SOURCE_DATA`` to a concrete OpenHexa dataset file.

``SOURCE_DATA`` in ``SNT_metadata.json`` names a dataset by an identifier key
(``SNT_DHIS2_INCIDENCE``) and a filename template (``{COUNTRY_CODE}_incidence.csv``);
``SNT_config.json`` maps that key to a dataset slug and supplies the country code.
"""

import logging

from dataclasses import dataclass

from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _


logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class SourceFile:
    dataset_slug: str
    filename: str
    column: str


def _normalize(identifier: str) -> str:
    # The two files disagree on the "SNT_" prefix (SNT_DHIS2_INCIDENCE vs DHIS2_INCIDENCE);
    # normalise both sides so either spelling resolves.
    stripped = identifier.strip().upper()
    return stripped[4:] if stripped.startswith("SNT_") else stripped


def _lookup_dataset_slug(dataset_name: str, identifiers: dict) -> str:
    by_normalized = {_normalize(key): (key, slug) for key, slug in identifiers.items()}
    match = by_normalized.get(_normalize(dataset_name))
    if not match:
        logger.warning(
            "SOURCE_DATA dataset '%s' (normalized '%s') is not in SNT_config.json SNT_DATASET_IDENTIFIERS; known keys: %s",
            dataset_name,
            _normalize(dataset_name),
            sorted(identifiers.keys()),
        )
        raise ValidationError(
            _("Dataset identifier '{name}' is not defined in SNT_config.json (SNT_DATASET_IDENTIFIERS).").format(
                name=dataset_name
            )
        )
    config_key, slug = match
    logger.info(
        "SOURCE_DATA dataset '%s' resolved via SNT_config.json key '%s' -> dataset slug '%s'",
        dataset_name,
        config_key,
        slug,
    )
    return slug


def resolve_source_file(definition: dict, snt_config: dict) -> SourceFile:
    source_data = definition.get("SOURCE_DATA")
    if not isinstance(source_data, dict):
        raise ValidationError(_("This data layer has no usable SOURCE_DATA."))

    dataset = source_data.get("DATASET")
    dataset_name = dataset.get("NAME") if isinstance(dataset, dict) else None
    filename_template = source_data.get("FILENAME")
    column = source_data.get("COLUMN")
    if not dataset_name or not filename_template or not column:
        raise ValidationError(_("SOURCE_DATA is missing DATASET.NAME, FILENAME or COLUMN."))

    identifiers = snt_config.get("SNT_DATASET_IDENTIFIERS") or {}
    dataset_slug = _lookup_dataset_slug(dataset_name, identifiers)

    country_code = (snt_config.get("SNT_CONFIG") or {}).get("COUNTRY_CODE") or ""
    filename = filename_template.replace("{COUNTRY_CODE}", country_code)

    return SourceFile(dataset_slug=dataset_slug, filename=filename, column=column)
