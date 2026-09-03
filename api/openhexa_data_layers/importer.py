"""Load a data layer's values from its source CSV into ``MetricValue`` rows."""

import csv
import io
import logging

from typing import Optional

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils.translation import gettext_lazy as _

from iaso.models import MetricValue, OrgUnit


logger = logging.getLogger(__name__)

ORG_UNIT_ID_COLUMN = "ADM2_ID"
YEAR_COLUMN = "YEAR"
BULK_CREATE_BATCH_SIZE = 5000
UNMATCHED_SAMPLE_SIZE = 20


def _parse_year(raw: Optional[str]) -> Optional[int]:
    # No YEAR column, or an empty cell, means the value is timeless (year=None, not 0) so
    # downstream consumers recognise it as such. Real year handling lands in phase 4.
    return int(raw) if raw not in (None, "") else None


def _org_units_by_source_ref(account) -> dict:
    org_units = OrgUnit.objects.filter(
        version__account=account,
        version=account.default_version,
        source_ref__isnull=False,
    ).exclude(source_ref="")
    return {ou.source_ref: ou for ou in org_units}


def import_metric_values(metric_type, csv_text: str, column: str, task=None) -> int:
    """Replace ``metric_type``'s values with the ``column`` of ``csv_text``.

    Rows are matched to org units by ``ADM2_ID`` == ``OrgUnit.source_ref`` within the
    account's default version. Returns the number of values written.
    """
    reader = csv.DictReader(io.StringIO(csv_text))
    fieldnames = reader.fieldnames or []
    if ORG_UNIT_ID_COLUMN not in fieldnames:
        raise ValidationError(_("The source file has no '{column}' column.").format(column=ORG_UNIT_ID_COLUMN))
    if column not in fieldnames:
        raise ValidationError(_("The source file has no '{column}' column.").format(column=column))

    org_units_by_ref = _org_units_by_source_ref(metric_type.account)
    logger.info(
        "import_metric_values: %d org units with a source_ref in account %s (version %s)",
        len(org_units_by_ref),
        metric_type.account_id,
        metric_type.account.default_version_id,
    )

    # De-duplicate on (org unit, year): a later row for the same key wins, and the unique
    # constraint on MetricValue stays satisfied for bulk_create.
    values_by_key: dict = {}
    total_rows = 0
    blank_id_rows = 0
    empty_value_rows = 0
    matched_refs = set()
    unmatched_refs = set()
    for row in reader:
        total_rows += 1
        ref = (row.get(ORG_UNIT_ID_COLUMN) or "").strip()
        if not ref:
            blank_id_rows += 1
            continue
        org_unit = org_units_by_ref.get(ref)
        if org_unit is None:
            unmatched_refs.add(ref)
            continue
        matched_refs.add(ref)
        raw_value = row.get(column)
        if raw_value in (None, ""):
            empty_value_rows += 1
            continue
        try:
            value, string_value = float(raw_value), ""
        except (TypeError, ValueError):
            value, string_value = None, str(raw_value)
        year = _parse_year(row.get(YEAR_COLUMN))
        values_by_key[(org_unit.id, year)] = MetricValue(
            metric_type=metric_type,
            org_unit=org_unit,
            year=year,
            value=value,
            string_value=string_value,
        )

    logger.info(
        "import_metric_values: %d CSV rows -> %d matched org units, %d unmatched %s ids, "
        "%d blank ids, %d matched-but-empty values, %d values to write (after (org_unit, year) de-dup)",
        total_rows,
        len(matched_refs),
        len(unmatched_refs),
        ORG_UNIT_ID_COLUMN,
        blank_id_rows,
        empty_value_rows,
        len(values_by_key),
    )
    if unmatched_refs:
        sample = sorted(unmatched_refs)[:UNMATCHED_SAMPLE_SIZE]
        logger.warning(
            "import_metric_values: %d %s ids had no matching org unit (source_ref); sample: %s%s",
            len(unmatched_refs),
            ORG_UNIT_ID_COLUMN,
            sample,
            "" if len(unmatched_refs) <= UNMATCHED_SAMPLE_SIZE else " ...",
        )
    if not values_by_key:
        logger.warning("import_metric_values: no values matched - the layer will be created empty")

    if task is not None:
        task.report_progress_and_stop_if_killed(
            progress_message=_("{rows} rows read, {matched} org units matched, writing {count} values").format(
                rows=total_rows, matched=len(matched_refs), count=len(values_by_key)
            )
        )

    with transaction.atomic():
        MetricValue.objects.filter(metric_type=metric_type).delete()
        MetricValue.objects.bulk_create(list(values_by_key.values()), batch_size=BULK_CREATE_BATCH_SIZE)

    return len(values_by_key)
