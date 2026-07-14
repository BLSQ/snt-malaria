"""Preview and persistence of composite layer graph results.

Running a graph persists a ``MetricType`` (category "Composite") plus its ``MetricValue`` rows, so
the composite behaves like any other data layer -- including being reusable as an input to other
graphs. Numeric results are stored as ``MetricValue.value``; categorical results as
``MetricValue.string_value``.
"""

from __future__ import annotations

import uuid

from typing import Iterable, Tuple

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
            "name": str,
            "units": "",
            "unit_symbol": "",
            "legend_type": str,
            "legend_config": {"domain": [...], "range": [...]},
            "metric_values": [{"org_unit": id, "value": float|None, "string_value": str|None, "year": int|None}, ...],
            "years": [int, ...],  # distinct non-null years, newest first
        }
    """
    evaluator = CompositeGraphEvaluator(account, graph, org_unit_ids)
    name, values_by_year = evaluator.run(require_name=False)
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
        "name": name,
        "units": "",
        "unit_symbol": "",
        "legend_type": legend_type,
        "legend_config": legend_config,
        "metric_values": metric_values,
        "years": sorted(years, reverse=True),
    }


@transaction.atomic
def run_and_persist_composite_layer(account, graph: dict, org_unit_ids: Iterable[int]) -> MetricType:
    """Execute ``graph`` and persist the result as a new ``MetricType`` + ``MetricValue`` rows."""
    evaluator = CompositeGraphEvaluator(account, graph, org_unit_ids)
    name, values_by_year = evaluator.run()
    legend_type, legend_config = resolve_output_legend(account, evaluator, values_by_year)

    code = f"composite_{slugify(name)[:80]}_{uuid.uuid4().hex[:8]}"
    metric_type = MetricType.objects.create(
        account=account,
        name=name,
        code=code,
        category="Composite",
        origin=MetricType.MetricTypeOrigin.CUSTOM,
        metric_kind=MetricType.MetricKind.ANY,
        legend_type=legend_type,
        legend_config=legend_config,
        source="composite-layer-editor",
    )
    _write_metric_values(metric_type, values_by_year)
    return metric_type


@transaction.atomic
def update_composite_metric_type(
    account, metric_type: MetricType, graph: dict, org_unit_ids: Iterable[int]
) -> Tuple[str, MetricType]:
    """Re-run ``graph`` and update an existing composite ``MetricType`` in place.

    Keeps the same ``MetricType`` id (so existing references stay valid) while refreshing its name,
    legend and ``MetricValue`` rows. Returns ``(name, metric_type)``.
    """
    evaluator = CompositeGraphEvaluator(account, graph, org_unit_ids)
    name, values_by_year = evaluator.run()

    legend_type, legend_config = resolve_output_legend(account, evaluator, values_by_year)
    metric_type.name = name
    metric_type.legend_type = legend_type
    metric_type.legend_config = legend_config
    metric_type.save(update_fields=["name", "legend_type", "legend_config", "updated_at"])

    MetricValue.objects.filter(metric_type=metric_type).delete()
    _write_metric_values(metric_type, values_by_year)

    return name, metric_type
