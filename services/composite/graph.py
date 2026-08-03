"""Structural helpers for composite layer graphs.

Pure graph manipulation: no database access and no evaluation, so the API layer can seed and
reconcile a graph without pulling in the evaluator.

The legend is stored twice: on ``CompositeLayer``, and inside the graph's output node where the
evaluator reads it. These helpers are the single place where the two are kept in sync.
"""

from __future__ import annotations

import copy

from plugins.snt_malaria.models import CompositeLayer


OUTPUT_NODE_ID = "output"
OUTPUT_NODE_TYPE = "output"
# Must match the `output` nodeType's `initialWidth` in js/.../compositeLayerEditor/flumeConfig.ts:
# a node carries its own width, and without one it renders at a tiny default.
OUTPUT_NODE_WIDTH = 330

AUTO_LEGEND = CompositeLayer.LegendType.AUTO
REFERENCE_LEGEND = CompositeLayer.LegendType.REFERENCE
# Legend types whose buckets are configured by hand rather than resolved from the values.
CONCRETE_LEGEND_TYPES = (
    CompositeLayer.LegendType.LINEAR,
    CompositeLayer.LegendType.THRESHOLD,
    CompositeLayer.LegendType.ORDINAL,
)


def find_output_node(graph: dict | None) -> dict | None:
    """The graph's single output node, or None if there isn't exactly one."""
    if not isinstance(graph, dict):
        return None
    output_nodes = [node for node in graph.values() if isinstance(node, dict) and node.get("type") == OUTPUT_NODE_TYPE]
    return output_nodes[0] if len(output_nodes) == 1 else None


def is_runnable(graph: dict | None) -> bool:
    """Whether the graph is wired up enough to be worth evaluating."""
    output_node = find_output_node(graph)
    if output_node is None:
        return False
    inputs = (output_node.get("connections") or {}).get("inputs") or {}
    return bool(inputs.get("layer"))


def is_valid_legend_config(legend_config) -> bool:
    """A manual legend must carry non-empty ``domain`` and ``range`` lists to be usable."""
    return (
        isinstance(legend_config, dict)
        and isinstance(legend_config.get("domain"), list)
        and isinstance(legend_config.get("range"), list)
        and len(legend_config["domain"]) > 0
        and len(legend_config["range"]) > 0
    )


def seed_graph(legend_type=None, legend_config=None, reference_metric_type_id=None) -> dict:
    """A brand-new graph: nothing but the output node, carrying the requested legend."""
    return apply_legend_to_graph({}, legend_type, legend_config, reference_metric_type_id)


def apply_legend_to_graph(graph: dict | None, legend_type=None, legend_config=None, reference_metric_type_id=None):
    """Write the legend onto the graph's output node, returning a new graph.

    Adds an output node when the graph has none. ``legend_config`` is only kept for a concrete legend
    type, so switching to auto/reference drops stale buckets.
    """
    graph = copy.deepcopy(graph) if isinstance(graph, dict) else {}
    output_node = find_output_node(graph)
    if output_node is None:
        output_node = {
            "id": OUTPUT_NODE_ID,
            "type": OUTPUT_NODE_TYPE,
            "width": OUTPUT_NODE_WIDTH,
            "x": 0,
            "y": 0,
            "inputData": {},
            "connections": {"inputs": {}, "outputs": {}},
        }
        graph[OUTPUT_NODE_ID] = output_node
    input_data = dict(output_node.get("inputData") or {})

    legend = {"legendType": legend_type or CompositeLayer.LegendType.AUTO}
    if legend_type in CONCRETE_LEGEND_TYPES and is_valid_legend_config(legend_config):
        legend["legendConfig"] = copy.deepcopy(legend_config)
    input_data["legend"] = legend

    if legend_type == CompositeLayer.LegendType.REFERENCE:
        input_data["referenceLayer"] = {"referenceMetricTypeId": reference_metric_type_id}
    else:
        input_data.pop("referenceLayer", None)

    output_node["inputData"] = input_data
    return graph


def read_legend_from_graph(graph: dict | None) -> tuple:
    """The legend set on the graph's output node, as ``(legend_type, legend_config, reference_id)``."""
    output_node = find_output_node(graph)
    input_data = (output_node or {}).get("inputData") or {}
    legend = input_data.get("legend") or {}
    reference_layer = input_data.get("referenceLayer") or {}

    legend_type = legend.get("legendType") or CompositeLayer.LegendType.AUTO
    legend_config = legend.get("legendConfig")
    reference_metric_type_id = reference_layer.get("referenceMetricTypeId")
    try:
        reference_metric_type_id = int(reference_metric_type_id)
    except (TypeError, ValueError):
        reference_metric_type_id = None

    return (
        legend_type,
        copy.deepcopy(legend_config) if is_valid_legend_config(legend_config) else {},
        reference_metric_type_id,
    )
