"""Legend resolution for composite layers.

A single legend is computed over the values of all years combined, so maps stay comparable across
years. Categorical results always get an ordinal legend; numeric results honour the legend type
chosen on the output node, defaulting to a threshold legend.
"""

from __future__ import annotations

import copy

from typing import Tuple

from iaso.models.metric import MetricType
from iaso.utils.legend import SEVEN_SHADES, build_auto_legend_config, is_categorical_values, resolve_auto_legend_type

from .evaluator import CompositeGraphEvaluator, ValuesByYear, iter_all_values
from .graph import CONCRETE_LEGEND_TYPES, REFERENCE_LEGEND, is_valid_legend_config


def placeholder_legend(legend_type=None, legend_config=None) -> Tuple[str, dict]:
    """Legend for a composite that has no values yet: the requested one when it is concrete enough
    to stand on its own, else an empty threshold legend until the first successful run."""
    if legend_type in CONCRETE_LEGEND_TYPES and is_valid_legend_config(legend_config):
        return legend_type, {"domain": list(legend_config["domain"]), "range": list(legend_config["range"])}
    return MetricType.LegendType.THRESHOLD, {"domain": [], "range": list(SEVEN_SHADES)}


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
    categorical = is_categorical_values(all_values)

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

    # A configured legend is used verbatim; categorical results only accept an ordinal one.
    manual = evaluator.output_legend_config
    if selected in CONCRETE_LEGEND_TYPES and is_valid_legend_config(manual):
        if not categorical or selected == MetricType.LegendType.ORDINAL:
            return selected, {"domain": list(manual["domain"]), "range": list(manual["range"])}

    if categorical:
        legend_type = MetricType.LegendType.ORDINAL
        return legend_type, build_auto_legend_config(legend_type, all_values, category_order)

    legend_type = resolve_auto_legend_type(selected, all_values)
    return legend_type, build_auto_legend_config(legend_type, all_values, category_order)
