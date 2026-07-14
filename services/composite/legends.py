"""Legend resolution for composite layers.

A single legend is computed over the values of all years combined, so maps stay comparable across
years. Categorical results always get an ordinal legend; numeric results honour the legend type
chosen on the output node, defaulting to a threshold legend.
"""

from __future__ import annotations

import copy

from typing import Iterable, List, Tuple

from iaso.models.metric import MetricType
from iaso.utils.legend import SEVEN_SHADES, get_range_from_count

from .evaluator import CompositeGraphEvaluator, Value, ValuesByYear, iter_all_values


# Number of colours used for an auto-generated threshold legend (=> num_colors - 1 breakpoints).
NUM_THRESHOLD_COLORS = len(SEVEN_SHADES)

# Legend type value (UI-only) that reuses another layer's legend instead of computing one.
REFERENCE_LEGEND = "reference"


def _is_categorical(values: Iterable[Value]) -> bool:
    return any(isinstance(value, str) for value in values)


def _ordinal_legend_config(domain: List) -> dict:
    palette = list(SEVEN_SHADES)
    colors = [palette[index % len(palette)] for index in range(len(domain))]
    return {"domain": list(domain), "range": colors}


def _linear_legend_config(low: float, high: float) -> dict:
    # d3's ``scaleLinear`` needs ``len(domain) == len(range)``, so emit exactly two of each; the
    # frontend interpolates colours between ``low`` and ``high``.
    return {"domain": [low, high], "range": [SEVEN_SHADES[0], SEVEN_SHADES[-1]]}


def _threshold_legend_config(low: float, high: float, num_colors: int = NUM_THRESHOLD_COLORS) -> dict:
    """Equal-interval threshold classification.

    d3's ``scaleThreshold`` expects ``len(range) == len(domain) + 1`` (one extra colour for the
    bucket above the last breakpoint), so ``num_colors`` colours need ``num_colors - 1`` *interior*
    breakpoints dividing ``[low, high]`` into equal buckets.
    """
    if low is None or high is None or high <= low:
        # Degenerate range (all values equal / single value): one breakpoint, two colours.
        return {"domain": [low], "range": [SEVEN_SHADES[0], SEVEN_SHADES[-1]]}

    round_digits = 2 if low < 1 else 0
    step = (high - low) / num_colors
    breakpoints: List[float] = []
    for index in range(1, num_colors):
        value = round(low + step * index, round_digits)
        # Rounding can collapse neighbouring breakpoints on a small range; keep them distinct.
        if not breakpoints or value != breakpoints[-1]:
            breakpoints.append(value)
    return {"domain": breakpoints, "range": get_range_from_count(len(breakpoints))}


def _build_legend_config(legend_type: str, values: Iterable[Value], category_order: List[str] | None = None) -> dict:
    non_null = [value for value in values if value is not None]

    if legend_type == MetricType.LegendType.ORDINAL:
        if _is_categorical(non_null):
            domain = list(category_order) if category_order else sorted({str(value) for value in non_null})
        else:
            # Numeric values treated as discrete ordinal categories.
            domain = sorted({value for value in non_null})
        return _ordinal_legend_config(domain)

    if not non_null:
        return {"domain": [], "range": list(SEVEN_SHADES)}

    low, high = min(non_null), max(non_null)
    if legend_type == MetricType.LegendType.LINEAR:
        return _linear_legend_config(low, high)

    return _threshold_legend_config(low, high)


def _resolve_legend_type(selected: str | None, values: Iterable[Value]) -> str:
    """Pick the effective legend type from the user's choice and the resolved values.

    Categorical results are always ordinal (numeric legends can't render strings). For numeric
    results, honour an explicit ``linear``/``threshold``/``ordinal`` choice; ``auto`` (or anything
    unrecognised) defaults to a threshold legend.
    """
    if _is_categorical(values):
        return MetricType.LegendType.ORDINAL

    selected = (selected or "auto").lower()
    if selected == MetricType.LegendType.LINEAR:
        return MetricType.LegendType.LINEAR
    if selected == MetricType.LegendType.ORDINAL:
        return MetricType.LegendType.ORDINAL
    return MetricType.LegendType.THRESHOLD


def _get_reference_metric_type(account, reference_id) -> MetricType | None:
    """The account's ``MetricType`` to copy a legend from, or ``None`` if unusable."""
    try:
        reference_id = int(reference_id)
    except (TypeError, ValueError):
        return None
    reference = MetricType.objects.filter(id=reference_id, account=account).first()
    if reference is None or not reference.legend_type or not reference.legend_config:
        return None
    return reference


def resolve_output_legend(
    account, evaluator: CompositeGraphEvaluator, values_by_year: ValuesByYear
) -> Tuple[str, dict]:
    """Return ``(legend_type, legend_config)`` for the output, honouring the user's legend choice.

    A "reference" choice copies another layer's legend verbatim, falling back to the first
    connected data layer when no explicit reference is picked, and to the computed legend when the
    reference is missing or incompatible.
    """
    category_order = evaluator.output_category_order
    all_values = list(iter_all_values(values_by_year))
    categorical = _is_categorical(all_values)

    # A reference legend is honoured first (even for categorical output), so ordinal base layers
    # keep their exact colours instead of being rebuilt with default shades.
    selected = (evaluator.output_legend_type or "auto").lower()
    if selected == REFERENCE_LEGEND:
        reference = _get_reference_metric_type(account, evaluator.output_reference_metric_type_id)
        if reference is None:
            connected_ids = evaluator.connected_data_layer_metric_type_ids()
            if connected_ids:
                reference = _get_reference_metric_type(account, connected_ids[0])
        # Categorical results can only render with an ordinal reference legend; a numeric reference
        # legend falls through to the ordinal builder below.
        if reference is not None and (not categorical or reference.legend_type == MetricType.LegendType.ORDINAL):
            return reference.legend_type, copy.deepcopy(reference.legend_config)

    if categorical:
        legend_type = MetricType.LegendType.ORDINAL
        return legend_type, _build_legend_config(legend_type, all_values, category_order)

    legend_type = _resolve_legend_type(selected, all_values)
    return legend_type, _build_legend_config(legend_type, all_values, category_order)
