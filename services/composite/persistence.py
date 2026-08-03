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
from .graph import CONCRETE_LEGEND_TYPES, is_valid_legend_config
from .legends import placeholder_legend, resolve_output_legend


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


def _generate_code(name: str) -> str:
    # Suffixed with a random hex to satisfy MetricType's unique (account, code).
    return f"composite_{slugify(name)[:80]}_{uuid.uuid4().hex[:8]}"


def _create_metric_type(
    account,
    name: str,
    legend_type: str,
    legend_config: dict,
    category: str = "Composite",
    description: str = "",
    units: str = "",
    unit_symbol: str = "",
    is_population: bool = False,
) -> MetricType:
    return MetricType.objects.create(
        account=account,
        name=name,
        code=_generate_code(name),
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


def create_composite_metric_type(
    account,
    name: str,
    legend_type: str | None = None,
    legend_config: dict | None = None,
    **metadata,
) -> MetricType:
    """Create the ``MetricType`` backing a composite layer, without any ``MetricValue``.

    Used when the graph cannot run yet, so that the layer exists as soon as it is created; the values
    and the resolved legend follow on the first successful run.
    """
    resolved_type, resolved_config = placeholder_legend(legend_type, legend_config)
    return _create_metric_type(account, name, resolved_type, resolved_config, **metadata)


def apply_composite_metadata(
    metric_type: MetricType,
    name: str | None = None,
    category: str | None = None,
    description: str | None = None,
    units: str | None = None,
    unit_symbol: str | None = None,
    is_population: bool | None = None,
    legend_type: str | None = None,
    legend_config: dict | None = None,
) -> MetricType:
    """Update a composite ``MetricType``'s metadata without re-running its graph.

    Partial update: only the provided fields are written. The legend is applied only when it is
    concrete, since auto/reference legends can only be resolved by a run.
    """
    update_fields = ["updated_at"]

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

    if legend_type in CONCRETE_LEGEND_TYPES and is_valid_legend_config(legend_config):
        metric_type.legend_type, metric_type.legend_config = placeholder_legend(legend_type, legend_config)
        update_fields += ["legend_type", "legend_config"]

    metric_type.save(update_fields=update_fields)
    return metric_type


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
    """Execute ``graph`` and persist the result as a new ``MetricType`` + ``MetricValue`` rows."""
    evaluator = CompositeGraphEvaluator(account, graph, org_unit_ids)
    values_by_year = evaluator.run()
    legend_type, legend_config = resolve_output_legend(account, evaluator, values_by_year)

    metric_type = _create_metric_type(
        account,
        name,
        legend_type,
        legend_config,
        category=category,
        description=description,
        units=units,
        unit_symbol=unit_symbol,
        is_population=is_population,
    )
    _write_metric_values(metric_type, values_by_year)
    return metric_type


@transaction.atomic
def update_composite_metric_type(
    account,
    metric_type: MetricType,
    graph: dict,
    org_unit_ids: Iterable[int],
    name: str | None = None,
    category: str | None = None,
    description: str | None = None,
    units: str | None = None,
    unit_symbol: str | None = None,
    is_population: bool | None = None,
) -> MetricType:
    """Re-run ``graph`` and update an existing composite ``MetricType`` in place.

    Keeps the same ``MetricType`` id (so existing references stay valid) while refreshing its legend
    and ``MetricValue`` rows.
    """
    evaluator = CompositeGraphEvaluator(account, graph, org_unit_ids)
    values_by_year = evaluator.run()

    apply_composite_metadata(
        metric_type,
        name=name,
        category=category,
        description=description,
        units=units,
        unit_symbol=unit_symbol,
        is_population=is_population,
    )

    metric_type.legend_type, metric_type.legend_config = resolve_output_legend(account, evaluator, values_by_year)
    metric_type.save(update_fields=["legend_type", "legend_config", "updated_at"])

    MetricValue.objects.filter(metric_type=metric_type).delete()
    _write_metric_values(metric_type, values_by_year)

    return metric_type
