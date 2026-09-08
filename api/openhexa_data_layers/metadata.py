"""Turn the OpenHexa ``SNT_metadata.json`` definitions into data-layer dicts.

Each top-level key of the file is one data layer; its value carries the metadata used
to pre-fill the data-layer form. Phase 1 is English-first with a French fallback -
proper multi-language handling comes later.
"""

from typing import Any

from iaso.models.metric import MetricType
from iaso.utils.legend import NINE_SHADES, ORDINAL, get_range_from_count


LANGUAGE_FALLBACK_ORDER = ("EN", "FR")
UNIT_SYMBOL_MAX_LENGTH = 2
_VALID_LEGEND_TYPES = {choice.value for choice in MetricType.LegendType}

# Scale-break counts a legend type accepts - kept in sync with the metric type serializer
# and the data-layer form (LEGEND_TYPE_MIN/MAX_ITEMS).
_SCALE_BREAK_BOUNDS = {
    MetricType.LegendType.THRESHOLD.value: (2, 9),
    MetricType.LegendType.LINEAR.value: (2, 2),
    MetricType.LegendType.ORDINAL.value: (2, 4),
}


def _localized(field: Any, fallback: str = "") -> str:
    if not isinstance(field, dict):
        return (field or fallback) if isinstance(field, str) else fallback
    for language in LANGUAGE_FALLBACK_ORDER:
        value = field.get(language)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return fallback


def _legend_config(legend_type: str, scale: list) -> dict:
    """The {domain, range} the form shows. Mirrors the pure branches of
    ``iaso.utils.legend.get_legend_config`` (which can't be reused directly here - its
    linear branch needs a persisted ``MetricType`` for the value range)."""
    if legend_type == MetricType.LegendType.ORDINAL.value:
        return {"domain": list(scale), "range": list(ORDINAL.get(len(scale), []))}
    if legend_type == MetricType.LegendType.LINEAR.value:
        return {"domain": list(scale[:2]), "range": [NINE_SHADES[0], NINE_SHADES[-1]]}
    return {"domain": list(scale), "range": get_range_from_count(len(scale))}


def _scale_error(legend_type: str, scale_count: int) -> str:
    low, high = _SCALE_BREAK_BOUNDS.get(legend_type, (0, 0))
    if low <= scale_count <= high:
        return ""
    expected = str(low) if low == high else f"{low}-{high}"
    return f"A '{legend_type}' legend needs {expected} scale breaks, but this layer defines {scale_count}."


def build_data_layer(code: str, definition: dict) -> dict:
    legend_type = str(definition.get("TYPE") or "").lower()
    if legend_type not in _VALID_LEGEND_TYPES:
        legend_type = MetricType.LegendType.THRESHOLD.value

    raw_scale = definition.get("SCALE")
    scale = [value for value in raw_scale if isinstance(value, (int, float))] if isinstance(raw_scale, list) else []

    source_data = definition.get("SOURCE_DATA")
    column = str((source_data.get("COLUMN") if isinstance(source_data, dict) else "") or "")
    is_population = code.upper() == "POPULATION" or column.upper() == "POPULATION"

    unit_symbol = definition.get("UNIT_SYMBOL")
    unit_symbol = str(unit_symbol)[:UNIT_SYMBOL_MAX_LENGTH] if unit_symbol else ""

    return {
        "code": code,
        "name": _localized(definition.get("LABEL"), fallback=code),
        "description": _localized(definition.get("DESCRIPTION")),
        "source": _localized(definition.get("SOURCE")),
        "units": _localized(definition.get("UNITS")),
        "category": _localized(definition.get("CATEGORY"), fallback="Uncategorized"),
        "unit_symbol": unit_symbol,
        "legend_type": legend_type,
        "legend_config": _legend_config(legend_type, scale),
        "metric_kind": (MetricType.MetricKind.POPULATION.value if is_population else MetricType.MetricKind.ANY.value),
        "error": _scale_error(legend_type, len(scale)),
    }


def parse_data_layers(metadata: dict) -> list:
    if not isinstance(metadata, dict):
        return []
    return [build_data_layer(code, definition) for code, definition in metadata.items() if isinstance(definition, dict)]
