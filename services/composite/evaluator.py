"""
Backend execution of the composite-layer node graph produced by the Flume editor.

The frontend serializes a Flume graph as ``{ nodeId: {id, type, x, y, connections, inputData} }``.
The evaluator resolves it in dependency order (with cycle detection) and evaluates each node:

- ``dataLayer``: reads a picked ``MetricType`` and returns its value per org unit for every year it has.
- ``formula``:   evaluates an infix expression per org unit over its connected inputs (``a``, ``b``, …)
                 using ``simpleeval``. A string result makes the output categorical (ordinal).
- ``classify``:  maps a numeric input to category labels using ordered threshold rules.
- ``output``:    the single terminal node; its connected input is the resulting composite layer.

Values are keyed by year internally as ``{year: {org_unit_id: value}}`` (``None`` = timeless).
When yearly layers are combined, the result covers the intersection of their years, while timeless
layers broadcast across every resulting year.
"""

from __future__ import annotations

import ast
import operator

from typing import Callable, Dict, Iterable, Iterator, List, Optional, Tuple, Union

from simpleeval import DEFAULT_FUNCTIONS, InvalidExpression, SimpleEval

from iaso.models.metric import MetricType, MetricValue


# A resolved node value: numeric or a category label.
Value = Union[float, str]
ValuesByOrgUnit = Dict[int, Value]
ValuesByYear = Dict[Optional[int], ValuesByOrgUnit]

# Comparison operators available to a ``classify`` node's threshold rules.
CLASSIFY_OPERATORS: Dict[str, Callable[[float, float], bool]] = {
    "<": operator.lt,
    "<=": operator.le,
    ">": operator.gt,
    ">=": operator.ge,
    "==": operator.eq,
    "!=": operator.ne,
}

# Functions exposed to the infix formula evaluator on top of arithmetic operators.
FORMULA_FUNCTIONS = {
    **DEFAULT_FUNCTIONS,
    "abs": abs,
    "min": min,
    "max": max,
    "round": round,
}


class CompositeGraphError(Exception):
    """Raised when a graph is structurally invalid or a formula cannot be evaluated."""


def iter_all_values(values_by_year: ValuesByYear) -> Iterator[Value]:
    """Yield every value across all years of a ``{year: {org_unit_id: value}}`` mapping."""
    for by_ou in values_by_year.values():
        yield from by_ou.values()


def _coerce_numeric(value: Value) -> Value:
    """Convert numeric-looking strings to floats; leave genuine category labels alone.

    Values can arrive as strings (categorical data layers, reclassify labels). Without coercion,
    Python's string operators would silently produce nonsense in formulas: ``"1" + "2"`` is
    ``"12"`` and ``"1" * 2`` is ``"11"``. Non-numeric strings (e.g. ``"Peak"``) stay strings so
    formulas can still compare against category labels.
    """
    if isinstance(value, str):
        try:
            return float(value)
        except ValueError:
            return value
    return value


class CompositeGraphEvaluator:
    """Resolves a serialized Flume graph into per-org-unit values for the output node."""

    def __init__(self, account, graph: dict | None, org_unit_ids: Iterable[int]):
        self.account = account
        self.graph = graph or {}
        self.org_unit_ids = list(org_unit_ids)
        self._cache: Dict[str, ValuesByYear] = {}
        # node_ids currently being resolved, used to detect cycles.
        self._visiting: set = set()
        # Ordered category labels of the output when the result is categorical (else None); used by
        # the legend builder so an ordinal legend respects the rule order.
        self.output_category_order: List[str] | None = None
        # Legend type chosen on the output node ("auto"/"linear"/"threshold"/"ordinal"/"reference");
        # "auto" (or missing) picks based on whether the result is numeric or categorical.
        self.output_legend_type: str | None = None
        # When the legend type is "reference", the MetricType whose legend should be reused.
        self.output_reference_metric_type_id = None

    def run(self, require_name: bool = True) -> Tuple[str, ValuesByYear]:
        """Evaluate the graph and return ``(name, {year: {org_unit_id: value}})`` for the output node.

        ``require_name`` is relaxed for the live preview, where the graph is often evaluated before
        the user has typed a name.
        """
        if not isinstance(self.graph, dict) or not self.graph:
            raise CompositeGraphError("Graph is empty.")

        output_nodes = [node for node in self.graph.values() if node.get("type") == "output"]
        if len(output_nodes) != 1:
            raise CompositeGraphError("Graph must contain exactly one output node.")

        output_node = output_nodes[0]
        name = (self._get_control_value(output_node, "name", "name") or "").strip()
        if require_name and not name:
            raise CompositeGraphError("The output node must have a name.")

        self.output_legend_type = self._get_control_value(output_node, "legend", "legendType")
        self.output_reference_metric_type_id = self._get_control_value(
            output_node, "referenceLayer", "referenceMetricTypeId"
        )

        source = self._get_single_input_source(output_node, "layer")
        if source is None:
            raise CompositeGraphError("The output node is not connected to anything.")

        values_by_year = self._resolve(source["nodeId"])
        if not any(by_ou for by_ou in values_by_year.values()):
            raise CompositeGraphError("The graph produced no values for the current org units.")

        if any(isinstance(value, str) for value in iter_all_values(values_by_year)):
            source_node = self.graph.get(source["nodeId"])
            if source_node and source_node.get("type") == "classify":
                self.output_category_order = self._classify_category_order(source_node)
            elif source_node and source_node.get("type") == "dataLayer":
                # Reuse the source layer's own category order so its ordinal legend is preserved.
                self.output_category_order = self._data_layer_category_order(source_node)

        return name, values_by_year

    def connected_data_layer_metric_type_ids(self) -> List[int]:
        """MetricType ids of the data layers wired into the output, in traversal order (deduped).

        Walks depth-first from the output node following input connections, so it finds data layers
        even behind formula/classify transformations. Used to pick a sensible default reference
        legend (the first connected layer).
        """
        output_nodes = [node for node in self.graph.values() if node.get("type") == "output"]
        if len(output_nodes) != 1:
            return []

        ordered: List[int] = []
        visited: set = set()

        def visit(node_id: str) -> None:
            if node_id in visited:
                return
            visited.add(node_id)
            node = self.graph.get(node_id)
            if node is None:
                return
            if node.get("type") == "dataLayer":
                raw_id = self._get_control_value(node, "metricType", "metricTypeId")
                try:
                    metric_type_id = int(raw_id)
                except (TypeError, ValueError):
                    metric_type_id = None
                if metric_type_id is not None and metric_type_id not in ordered:
                    ordered.append(metric_type_id)
            inputs = (node.get("connections") or {}).get("inputs") or {}
            for sources in inputs.values():
                for source in sources:
                    visit(source["nodeId"])

        visit(output_nodes[0]["id"])
        return ordered

    def _resolve(self, node_id: str) -> ValuesByYear:
        if node_id in self._cache:
            return self._cache[node_id]
        if node_id in self._visiting:
            raise CompositeGraphError("The graph contains a cycle.")

        node = self.graph.get(node_id)
        if node is None:
            raise CompositeGraphError(f"Graph references an unknown node '{node_id}'.")

        self._visiting.add(node_id)
        node_type = node.get("type")
        if node_type == "dataLayer":
            result = self._resolve_data_layer(node)
        elif node_type == "formula":
            result = self._resolve_formula(node)
        elif node_type == "classify":
            result = self._resolve_classify(node)
        else:
            raise CompositeGraphError(f"Node '{node_id}' has an unsupported type '{node_type}'.")
        self._visiting.discard(node_id)

        self._cache[node_id] = result
        return result

    def _resolve_data_layer(self, node: dict) -> ValuesByYear:
        raw_id = self._get_control_value(node, "metricType", "metricTypeId")
        try:
            metric_type_id = int(raw_id)
        except (TypeError, ValueError):
            raise CompositeGraphError("A data layer node has no selected layer.")

        # Categorical layers (e.g. seasonality) store their category in ``string_value`` with a null
        # ``value``, so read both and keep whichever the row carries. Year-less rows go under the
        # ``None`` (timeless) bucket. The account filter on the join keeps tenancy in one query; the
        # ownership check below only runs when nothing came back.
        rows = list(
            MetricValue.objects.filter(
                metric_type_id=metric_type_id,
                metric_type__account=self.account,
                org_unit_id__in=self.org_unit_ids,
            ).values_list("org_unit_id", "year", "value", "string_value")
        )
        if not rows and not MetricType.objects.filter(id=metric_type_id, account=self.account).exists():
            raise CompositeGraphError(f"Metric type {metric_type_id} does not belong to this account.")

        values_by_year: ValuesByYear = {}
        for org_unit_id, year, value, string_value in rows:
            if value is not None:
                resolved: Value = float(value)
            elif string_value not in (None, ""):
                resolved = string_value
            else:
                continue
            values_by_year.setdefault(year, {})[org_unit_id] = resolved
        return values_by_year

    def _resolve_formula(self, node: dict) -> ValuesByYear:
        # Inputs are dynamic (a, b, c, …), so resolve whichever ports are actually connected.
        inputs: Dict[str, ValuesByYear] = {}
        connected_ports = (node.get("connections") or {}).get("inputs") or {}
        for port in connected_ports:
            source = self._get_single_input_source(node, port)
            if source is not None:
                inputs[port] = self._resolve(source["nodeId"])

        if not inputs:
            raise CompositeGraphError("A formula node has no connected inputs.")

        expression = (self._get_control_value(node, "formula", "formula") or "").strip()
        if not expression:
            raise CompositeGraphError("A formula node has an empty formula.")

        self._validate_formula_variables(expression, inputs.keys())

        evaluator = SimpleEval(functions=FORMULA_FUNCTIONS)
        _target_years, aligned = self._align_input_years(inputs)

        raw_by_year: ValuesByYear = {}
        for year, per_port in aligned.items():
            # Evaluate only for org units present in every connected input for this year.
            common_org_units = set.intersection(*[set(values.keys()) for values in per_port.values()])
            for org_unit_id in common_org_units:
                evaluator.names = {port: _coerce_numeric(per_port[port][org_unit_id]) for port in per_port}
                try:
                    value = evaluator.eval(expression)
                except InvalidExpression as error:
                    raise CompositeGraphError(f"Invalid formula '{expression}': {error}")
                except (ZeroDivisionError, ValueError, TypeError) as error:
                    raise CompositeGraphError(f"Error evaluating '{expression}': {error}")
                raw_by_year.setdefault(year, {})[org_unit_id] = value

        # A formula may take and produce strings (e.g. `"HIGH" if a > 100 else "LOW"`). If any
        # result is a string, treat the whole layer as categorical and stringify every value so
        # rows aren't a mix of numeric/string (which would render and store inconsistently).
        categorical = any(isinstance(value, str) for value in iter_all_values(raw_by_year))
        result: ValuesByYear = {}
        for year, by_ou in raw_by_year.items():
            result[year] = {
                org_unit_id: (str(value) if categorical else float(value)) for org_unit_id, value in by_ou.items()
            }
        return result

    @staticmethod
    def _align_input_years(
        inputs: Dict[str, ValuesByYear],
    ) -> Tuple[set, Dict[int | None, Dict[str, ValuesByOrgUnit]]]:
        """Align per-year inputs for combination.

        Returns ``(target_years, aligned)`` where ``aligned`` is ``{year: {port: {org_unit_id: value}}}``:

        - A port is *yearly* if it has any non-``None`` year, else *timeless*.
        - ``target_years`` is the intersection of the yearly ports' year sets; ``{None}`` if all
          ports are timeless.
        - For each target year, yearly ports contribute that year's bucket and timeless ports
          broadcast their ``None`` bucket.
        """
        yearly_year_sets = []
        for by_year in inputs.values():
            real_years = {year for year in by_year if year is not None}
            if real_years:
                yearly_year_sets.append(real_years)

        target_years = set.intersection(*yearly_year_sets) if yearly_year_sets else {None}

        aligned: Dict[int | None, Dict[str, ValuesByOrgUnit]] = {}
        for year in target_years:
            per_port = {}
            for port, by_year in inputs.items():
                # Timeless ports (or missing years) broadcast their year-less bucket.
                per_port[port] = by_year[year] if year in by_year else by_year.get(None, {})
            aligned[year] = per_port
        return target_years, aligned

    @staticmethod
    def _validate_formula_variables(expression: str, allowed_ports: Iterable[str]) -> None:
        # Parse the expression and look at real variable references (AST `Name` nodes) rather than
        # scanning the raw text, so single-letter *string literals* (e.g. category names like "a")
        # aren't mistaken for input ports. Input ports are single lowercase letters (a, b, c, …).
        try:
            tree = ast.parse(expression, mode="eval")
        except SyntaxError as error:
            raise CompositeGraphError(f"Invalid formula '{expression}': {error}")
        referenced = {
            child.id
            for child in ast.walk(tree)
            if isinstance(child, ast.Name) and len(child.id) == 1 and child.id.islower()
        }
        unknown = referenced - set(allowed_ports)
        if unknown:
            raise CompositeGraphError(f"Formula references unconnected inputs: {', '.join(sorted(unknown))}.")

    # The ``classify`` node type is labelled "Reclassify" in the editor, hence the wording of the
    # user-facing error messages below.
    def _resolve_classify(self, node: dict) -> ValuesByYear:
        source = self._get_single_input_source(node, "a")
        if source is None:
            raise CompositeGraphError("A reclassify node has no connected input.")
        input_by_year = self._resolve(source["nodeId"])

        rules, default_label = self._parse_classify_config(node)

        result: ValuesByYear = {}
        for year, by_ou in input_by_year.items():
            for org_unit_id, value in by_ou.items():
                try:
                    numeric = float(value)
                except (TypeError, ValueError):
                    raise CompositeGraphError("Reclassify can only be applied to a numeric input.")

                label = default_label
                for op_fn, threshold, rule_label in rules:
                    if op_fn(numeric, threshold):
                        label = rule_label
                        break
                if label:
                    result.setdefault(year, {})[org_unit_id] = label
        return result

    def _parse_classify_config(self, node: dict) -> Tuple[List[Tuple[Callable, float, str]], str]:
        """Return ``([(op_fn, threshold, label), ...], default_label)`` from a classify node."""
        config = self._get_control_value(node, "config", "rules") or {}
        raw_rules = config.get("rules") or []
        default_label = (config.get("default") or "").strip()

        rules = []
        for raw_rule in raw_rules:
            op = raw_rule.get("op")
            if op not in CLASSIFY_OPERATORS:
                raise CompositeGraphError(f"A reclassify rule has an invalid operator '{op}'.")
            label = (raw_rule.get("label") or "").strip()
            if not label:
                raise CompositeGraphError("A reclassify rule is missing its category label.")
            threshold = raw_rule.get("value")
            if threshold is None or threshold == "":
                raise CompositeGraphError(f"The reclassify rule for '{label}' is missing its value.")
            try:
                threshold = float(threshold)
            except (TypeError, ValueError):
                raise CompositeGraphError(f"The reclassify value '{threshold}' is not a number.")
            rules.append((CLASSIFY_OPERATORS[op], threshold, label))

        if not rules and not default_label:
            raise CompositeGraphError("A reclassify node has no mappings.")
        return rules, default_label

    def _classify_category_order(self, node: dict) -> List[str]:
        """Ordered, de-duplicated category labels declared on a classify node (rules first, then default)."""
        rules, default_label = self._parse_classify_config(node)
        order = []
        for _op_fn, _threshold, label in rules:
            if label not in order:
                order.append(label)
        if default_label and default_label not in order:
            order.append(default_label)
        return order

    def _data_layer_category_order(self, node: dict) -> List[str] | None:
        """Category order of a categorical data layer, taken from its own legend (or ``None``)."""
        raw_id = self._get_control_value(node, "metricType", "metricTypeId")
        try:
            metric_type_id = int(raw_id)
        except (TypeError, ValueError):
            return None
        metric_type = MetricType.objects.filter(id=metric_type_id, account=self.account).first()
        if metric_type and isinstance(metric_type.legend_config, dict):
            domain = metric_type.legend_config.get("domain")
            if isinstance(domain, list) and domain:
                return [str(entry) for entry in domain]
        return None

    @staticmethod
    def _get_single_input_source(node: dict, port_name: str) -> dict | None:
        connections = (node.get("connections") or {}).get("inputs") or {}
        sources = connections.get(port_name) or []
        return sources[0] if sources else None

    @staticmethod
    def _get_control_value(node: dict, port_name: str, control_name: str):
        input_data = node.get("inputData") or {}
        return (input_data.get(port_name) or {}).get(control_name)
