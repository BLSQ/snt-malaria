"""Preview and persistence of composite layer graph results.

Running a graph persists a ``MetricType`` (category "Composite") plus its ``MetricValue`` rows, so
the composite behaves like any other data layer -- including being reusable as an input to other
graphs. Numeric results are stored as ``MetricValue.value``; categorical results as
``MetricValue.string_value``.
"""

from __future__ import annotations

import uuid

from typing import Iterable

from django.db import transaction
from django.utils.text import slugify

from iaso.models.metric import MetricType, MetricValue

from .evaluator import CompositeGraphEvaluator, ValuesByYear
from .legends import resolve_output_legend


BULK_CREATE_BATCH_SIZE = 1000


def _write_metric_values(metric_type: MetricType, values_by_year: ValuesByYear) -> None:
    rows = []
    for year, by_ou in values_by_year.items():
        for org_unit_id, value in by_ou.items():
            if value is None:
                continue
            if isinstance(value, str):
                rows.append(
                    MetricValue(
                        metric_type=metric_type, org_unit_id=org_unit_id, year=year, value=None, string_value=value
                    )
                )
            else:
                rows.append(
                    MetricValue(metric_type=metric_type, org_unit_id=org_unit_id, year=year, value=float(value))
                )
    MetricValue.objects.bulk_create(rows, batch_size=BULK_CREATE_BATCH_SIZE)


def preview_composite_layer(account, graph: dict, org_unit_ids: Iterable[int]) -> dict:
    """Evaluate ``graph`` and return its result WITHOUT persisting anything.

    Used by the live in-editor preview. Returns a dict shaped for the map component::

        {
            "units": "",
            "unit_symbol": "",
            "legend_type": str,
            "legend_config": {"domain": [...], "range": [...]},
            "metric_values": [{"org_unit": id, "value": float|None, "string_value": str|None, "year": int|None}, ...],
            "years": [int, ...],  # distinct non-null years, newest first
        }
    """
    evaluator = CompositeGraphEvaluator(account, graph, org_unit_ids)
    values_by_year = evaluator.run()
    legend_type, legend_config = resolve_output_legend(account, evaluator, values_by_year)

    metric_values = []
    years = set()
    for year, by_ou in values_by_year.items():
        if year is not None:
            years.add(year)
        for org_unit_id, value in by_ou.items():
            if isinstance(value, str):
                metric_values.append({"org_unit": org_unit_id, "value": None, "string_value": value, "year": year})
            elif value is not None:
                metric_values.append(
                    {"org_unit": org_unit_id, "value": float(value), "string_value": None, "year": year}
                )

    return {
        "units": "",
        "unit_symbol": "",
        "legend_type": legend_type,
        "legend_config": legend_config,
        "metric_values": metric_values,
        "years": sorted(years, reverse=True),
    }


@transaction.atomic
def run_and_persist_composite_layer(
    account,
    graph: dict,
    org_unit_ids: Iterable[int],
    name: str,
    category: str = "Composite",
    description: str = "",
    units: str = "",
    unit_symbol: str = "",
    is_population: bool = False,
) -> MetricType:
    """Execute ``graph`` and persist the result as a new ``MetricType`` + ``MetricValue`` rows.

    Metadata (``name``, ``category``, ``is_population``, …) is owned by the creation dialogue, not
    the graph. A composite can be flagged as a population layer just like a standard layer.
    """
    evaluator = CompositeGraphEvaluator(account, graph, org_unit_ids)
    values_by_year = evaluator.run()
    legend_type, legend_config = resolve_output_legend(account, evaluator, values_by_year)

    code = f"composite_{slugify(name)[:80]}_{uuid.uuid4().hex[:8]}"
    metric_type = MetricType.objects.create(
        account=account,
        name=name,
        code=code,
        category=category or "Composite",
        description=description or "",
        units=units or "",
        unit_symbol=unit_symbol or "",
        origin=MetricType.MetricTypeOrigin.CUSTOM,
        metric_kind=(MetricType.MetricKind.POPULATION if is_population else MetricType.MetricKind.ANY),
        legend_type=legend_type,
        legend_config=legend_config,
        source="composite-layer-editor",
    )
    _write_metric_values(metric_type, values_by_year)
    return metric_type


@transaction.atomic
def update_composite_metric_type(
    account,
    metric_type: MetricType,
    graph: dict,
    org_unit_ids: Iterable[int],
    name: str = None,
    category: str = None,
    description: str = None,
    units: str = None,
    unit_symbol: str = None,
    is_population: bool = None,
) -> MetricType:
    """Re-run ``graph`` and update an existing composite ``MetricType`` in place.

    Keeps the same ``MetricType`` id (so existing references stay valid) while refreshing its legend
    and ``MetricValue`` rows. Metadata fields are updated only when provided (dialogue-owned).
    Returns the updated ``metric_type``.
    """
    evaluator = CompositeGraphEvaluator(account, graph, org_unit_ids)
    values_by_year = evaluator.run()

    legend_type, legend_config = resolve_output_legend(account, evaluator, values_by_year)
    metric_type.legend_type = legend_type
    metric_type.legend_config = legend_config
    update_fields = ["legend_type", "legend_config", "updated_at"]

    # Apply the dialogue-owned metadata when provided; leave untouched otherwise (partial update).
    for field, value in (
        ("name", name),
        ("category", category),
        ("description", description),
        ("units", units),
        ("unit_symbol", unit_symbol),
    ):
        if value is not None:
            setattr(metric_type, field, value)
            update_fields.append(field)

    if is_population is not None:
        metric_type.metric_kind = MetricType.MetricKind.POPULATION if is_population else MetricType.MetricKind.ANY
        update_fields.append("metric_kind")

    metric_type.save(update_fields=update_fields)

    MetricValue.objects.filter(metric_type=metric_type).delete()
    _write_metric_values(metric_type, values_by_year)

    return metric_type
