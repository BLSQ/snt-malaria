"""
Execution of a composite layer's node graph.

A Flume graph is serialized as ``{ nodeId: {id, type, x, y, connections, inputData} }``. The
evaluator resolves it in dependency order (with cycle detection) and evaluates each node:

- ``dataLayer``: reads a picked ``MetricType`` and returns its value per org unit for every year it has.
- ``formula``:   evaluates an infix expression per org unit over its connected inputs (``a``, ``b``, …)
                 using ``simpleeval``. A string result makes the output categorical (ordinal).
- ``classify``:  maps a numeric input to category labels using ordered threshold rules.
- ``normalize``: rescales a numeric input to 0-1 or 0-100, per year, either by min-max position or
                 by percentile rank.
- ``combine``:   reduces any number of numeric inputs per org unit (mean/sum/min/max), or stacks
                 them by priority (see ``_resolve_stack``).
- ``filter``:    restricts a single input to a selected set of org units.
- ``output``:    the single terminal node; its connected input is the resulting composite layer.

Values are keyed by year internally as ``{year: {org_unit_id: value}}`` (``None`` = timeless). An
org unit absent from a year's mapping means "no value here" - no node ever stores ``None``; a
``filter`` node drops org units it doesn't select rather than nulling them out, which is what lets
``combine``'s ``stack`` operation treat "does this input have a value for this org unit" as a plain
membership check.

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

# Reducers available to a ``combine`` node. All are symmetric (order-independent), which is what
# makes a single dropdown safe: the unlabeled inputs a, b, c, … are interchangeable. ``stack`` (see
# STACK_OPERATION below) is deliberately not in this dict: it is the one ``combine`` operation that
# is NOT a symmetric reducer, so it takes a separate code path (``_resolve_stack``).
COMBINE_OPERATIONS: Dict[str, Callable[[List[float]], float]] = {
    "mean": lambda values: sum(values) / len(values),
    "sum": sum,
    "min": min,
    "max": max,
}

# The one ``combine`` operation that merges its inputs over the UNION of their org units by
# priority, instead of reducing the INTERSECTION with a symmetric function. Priority is given
# explicitly (``inputData.operation.priorityOrder``, see ``_resolve_stack_order``) since the
# unlabeled ports a, b, c, … are ordered only by connection slot, not by meaning.
STACK_OPERATION = "stack"


class CompositeGraphError(Exception):
    """Raised when a graph is structurally invalid or a formula cannot be evaluated."""


class CompositeGraphIncompleteError(CompositeGraphError):
    """Raised when a graph is merely unfinished: a node is not wired up or not configured yet.

    Saving such a graph is legitimate (the user is still building it), so callers store it and skip
    the value refresh instead of reporting an error.
    """


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
        # Manually-configured legend {domain, range} (None => auto-compute the buckets).
        self.output_legend_config = None

    def run(self) -> ValuesByYear:
        """Evaluate the graph and return ``{year: {org_unit_id: value}}`` for the output node."""
        if not isinstance(self.graph, dict) or not self.graph:
            raise CompositeGraphIncompleteError("Graph is empty.")

        output_nodes = [node for node in self.graph.values() if node.get("type") == "output"]
        if len(output_nodes) != 1:
            raise CompositeGraphIncompleteError("Graph must contain exactly one output node.")

        output_node = output_nodes[0]

        self.output_legend_type = self._get_control_value(output_node, "legend", "legendType")
        self.output_legend_config = self._get_control_value(output_node, "legend", "legendConfig")
        self.output_reference_metric_type_id = self._get_control_value(
            output_node, "referenceLayer", "referenceMetricTypeId"
        )

        source = self._get_single_input_source(output_node, "layer")
        if source is None:
            raise CompositeGraphIncompleteError("The output node is not connected to anything.")

        values_by_year = self._resolve(source["nodeId"])
        if not any(by_ou for by_ou in values_by_year.values()):
            raise CompositeGraphIncompleteError("The graph produced no values for the current districts.")

        if any(isinstance(value, str) for value in iter_all_values(values_by_year)):
            source_node = self.graph.get(source["nodeId"])
            if source_node and source_node.get("type") == "classify":
                self.output_category_order = self._classify_category_order(source_node)
            elif source_node and source_node.get("type") == "dataLayer":
                # Reuse the source layer's own category order so its ordinal legend is preserved.
                self.output_category_order = self._data_layer_category_order(source_node)

        return values_by_year

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
        elif node_type == "normalize":
            result = self._resolve_normalize(node)
        elif node_type == "filter":
            result = self._resolve_filter(node)
        elif node_type == "combine":
            result = self._resolve_combine(node)
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
            raise CompositeGraphIncompleteError("A data layer node has no selected layer.")

        pinned_year = self._get_pinned_year(node)

        # Categorical layers (e.g. seasonality) store their category in ``string_value`` with a null
        # ``value``, so read both and keep whichever the row carries. Year-less rows go under the
        # ``None`` (timeless) bucket. The account filter on the join keeps tenancy in one query; the
        # ownership check below only runs when nothing came back.
        queryset = MetricValue.objects.filter(
            metric_type_id=metric_type_id,
            metric_type__account=self.account,
            org_unit_id__in=self.org_unit_ids,
        )
        if pinned_year is not None:
            queryset = queryset.filter(year=pinned_year)
        rows = list(queryset.values_list("org_unit_id", "year", "value", "string_value"))
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
            # A pinned year collapses every row into the timeless bucket, so the node's output
            # broadcasts (like any other timeless source) into whatever it's combined with.
            bucket_year = None if pinned_year is not None else year
            values_by_year.setdefault(bucket_year, {})[org_unit_id] = resolved
        return values_by_year

    @staticmethod
    def _get_pinned_year(node: dict) -> int | None:
        """The data layer's pinned year, or ``None`` for "all years" (unset, blank, or invalid).

        The frontend's own "all years" sentinel is the non-numeric string ``"all"``, which falls
        through the same ``int()`` failure as any other unset/invalid value below.
        """
        raw_year = CompositeGraphEvaluator._get_control_value(node, "metricType", "selectedYear")
        if raw_year in (None, ""):
            return None
        try:
            return int(raw_year)
        except (TypeError, ValueError):
            return None

    def _resolve_formula(self, node: dict) -> ValuesByYear:
        # Inputs are dynamic (a, b, c, …), so resolve whichever ports are actually connected.
        inputs = self._resolve_dynamic_inputs(node, "A formula node has no connected inputs.")

        expression = (self._get_control_value(node, "formula", "formula") or "").strip()
        if not expression:
            raise CompositeGraphIncompleteError("A formula node has an empty formula.")

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

    # A ``classify`` node is named "Reclassify" for users, hence the error messages below.
    def _resolve_classify(self, node: dict) -> ValuesByYear:
        source = self._get_single_input_source(node, "a")
        if source is None:
            raise CompositeGraphIncompleteError("A reclassify node has no connected input.")
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

    def _resolve_normalize(self, node: dict) -> ValuesByYear:
        """Rescale a numeric input to ``[0, scale]``, independently per year.

        Two normalization types are offered (both scoped to the year's own distribution, so years
        stay comparable to each other even when absolute magnitudes drift over time):

        - ``min-max``: position between the distribution's min and max. Magnitude-sensitive, so a
          single outlier stretches the scale and crushes the other values together.
        - ``percentile``: fraction of values the input beats. Rank-based and magnitude-blind, so
          outliers don't distort the rest of the distribution.
        """
        source = self._get_single_input_source(node, "a")
        if source is None:
            raise CompositeGraphIncompleteError("A normalize node has no connected input.")
        input_by_year = self._resolve(source["nodeId"])

        raw_scale = self._get_control_value(node, "scale", "scale")
        try:
            scale = float(raw_scale if raw_scale not in (None, "") else 1)
        except (TypeError, ValueError):
            raise CompositeGraphError(f"A normalize node has an invalid scale '{raw_scale}'.")

        normalize_type = self._get_control_value(node, "scale", "normalizeType") or "min-max"
        if normalize_type not in ("min-max", "percentile"):
            raise CompositeGraphError(f"A normalize node has an unknown normalization type '{normalize_type}'.")

        result: ValuesByYear = {}
        for year, by_ou in input_by_year.items():
            if not by_ou:
                continue
            numeric: Dict[int, float] = {}
            for org_unit_id, value in by_ou.items():
                try:
                    numeric[org_unit_id] = float(value)
                except (TypeError, ValueError):
                    raise CompositeGraphError("Normalize can only be applied to a numeric input.")

            if normalize_type == "percentile":
                result[year] = self._percentile_rank(numeric, scale)
            else:
                result[year] = self._min_max_scale(numeric, scale)
        return result

    @staticmethod
    def _min_max_scale(numeric: Dict[int, float], scale: float) -> ValuesByOrgUnit:
        low = min(numeric.values())
        high = max(numeric.values())
        span = high - low
        if span == 0:
            # Degenerate distribution (all values equal): there is no relative position, so map
            # everything to the midpoint rather than arbitrarily to the min or max.
            return {org_unit_id: scale / 2 for org_unit_id in numeric}
        return {org_unit_id: (value - low) / span * scale for org_unit_id, value in numeric.items()}

    @staticmethod
    def _percentile_rank(numeric: Dict[int, float], scale: float) -> ValuesByOrgUnit:
        """Fractional rank of each value among its peers, scaled to ``[0, scale]``.

        Tied values share the average of the ranks they span (e.g. two values tied for 2nd/3rd
        place both get rank 2.5), so ties land on the same output value instead of an arbitrary
        one breaking first.
        """
        n = len(numeric)
        if n == 1:
            (only_org_unit_id,) = numeric
            return {only_org_unit_id: scale / 2}

        ordered = sorted(numeric.items(), key=lambda item: item[1])
        ranks: Dict[int, float] = {}
        i = 0
        while i < n:
            j = i
            while j + 1 < n and ordered[j + 1][1] == ordered[i][1]:
                j += 1
            average_rank = (i + j) / 2
            for org_unit_id, _value in ordered[i : j + 1]:
                ranks[org_unit_id] = average_rank
            i = j + 1
        return {org_unit_id: rank / (n - 1) * scale for org_unit_id, rank in ranks.items()}

    def _resolve_filter(self, node: dict) -> ValuesByYear:
        """Keep only the selected org units, dropping every other one from the result.

        A district that isn't selected is *absent* from the output, never present with a null
        value - see the module docstring's "no node ever stores None" invariant. Filtering does
        not coerce values, so it works unchanged on numeric or categorical input.
        """
        source = self._get_single_input_source(node, "a")
        if source is None:
            raise CompositeGraphIncompleteError("A filter node has no connected input.")
        input_by_year = self._resolve(source["nodeId"])

        selected = self._resolve_selected_org_units(node)
        if not selected:
            raise CompositeGraphIncompleteError("A filter node has no selected districts.")

        result: ValuesByYear = {}
        for year, by_ou in input_by_year.items():
            kept = {org_unit_id: value for org_unit_id, value in by_ou.items() if org_unit_id in selected}
            if kept:
                result[year] = kept
        return result

    def _resolve_selected_org_units(self, node: dict) -> set:
        """Districts a filter node targets: an all/none base, flipped by one override list.

        Same resolution as ``ScenarioRule._compute_org_unit_ids``: the mode toggle stands in for
        that model's ``matching_criteria`` (``"all"`` == match-all, ``"none"`` == inclusion-only).
        Only one direction of override is ever meaningful for a given mode - under ``all`` the list
        is what gets dropped, under ``none`` it's what gets kept - so there is a single ``ids``
        field rather than separate included/excluded ones.
        """
        config = self._get_control_value(node, "selection", "orgUnits") or {}
        mode = (config.get("mode") or "none").lower()
        if mode not in ("all", "none"):
            raise CompositeGraphError(f"A filter node has an unknown selection mode '{mode}'.")

        ids = self._org_unit_id_set(config.get("ids"))
        return set(self.org_unit_ids) - ids if mode == "all" else ids

    @staticmethod
    def _org_unit_id_set(raw) -> set:
        if not isinstance(raw, list):
            return set()
        ids = set()
        for entry in raw:
            try:
                ids.add(int(entry))
            except (TypeError, ValueError):
                continue
        return ids

    def _resolve_dynamic_inputs(self, node: dict, empty_message: str) -> Dict[str, ValuesByYear]:
        """Resolve every connected dynamic port (a, b, c, …) of a multi-input node."""
        inputs: Dict[str, ValuesByYear] = {}
        connected_ports = (node.get("connections") or {}).get("inputs") or {}
        for port in connected_ports:
            source = self._get_single_input_source(node, port)
            if source is not None:
                inputs[port] = self._resolve(source["nodeId"])
        if not inputs:
            raise CompositeGraphIncompleteError(empty_message)
        return inputs

    def _resolve_combine(self, node: dict) -> ValuesByYear:
        """Reduce any number of numeric inputs per org unit with a symmetric operation.

        Inputs are year-aligned like a formula (intersection of yearly inputs, timeless inputs
        broadcast), and only org units present in every connected input for a year are combined.
        """
        inputs = self._resolve_dynamic_inputs(node, "A combine node has no connected inputs.")

        raw_operation = self._get_control_value(node, "operation", "operation") or "mean"
        if raw_operation == STACK_OPERATION:
            return self._resolve_stack(node, inputs)

        reducer = COMBINE_OPERATIONS.get(raw_operation)
        if reducer is None:
            raise CompositeGraphError(f"A combine node has an unknown operation '{raw_operation}'.")

        _target_years, aligned = self._align_input_years(inputs)

        result: ValuesByYear = {}
        for year, per_port in aligned.items():
            common_org_units = set.intersection(*[set(values.keys()) for values in per_port.values()])
            for org_unit_id in common_org_units:
                try:
                    numbers = [float(per_port[port][org_unit_id]) for port in per_port]
                except (TypeError, ValueError):
                    raise CompositeGraphError("Combine can only be applied to numeric inputs.")
                result.setdefault(year, {})[org_unit_id] = float(reducer(numbers))
        return result

    def _resolve_stack(self, node: dict, inputs: Dict[str, ValuesByYear]) -> ValuesByYear:
        """Merge inputs by priority: each org unit takes its value from the highest-priority input
        that has one, falling through to lower-priority inputs where it doesn't.

        Unlike the symmetric reducers, this covers the UNION of the inputs' org units rather than
        their intersection - an org unit missing from an input (e.g. filtered out upstream) is not
        a reason to drop it, it is the reason to fall through. Years are aligned exactly as for the
        other operations; priority is ascending, so the LAST port in the resolved order wins.
        """
        order = self._resolve_stack_order(node, inputs.keys())
        _target_years, aligned = self._align_input_years(inputs)

        result: ValuesByYear = {}
        for year, per_port in aligned.items():
            merged: ValuesByOrgUnit = {}
            for port in order:
                merged.update(per_port[port])
            if merged:
                result[year] = merged

        # A stack can mix numeric and categorical inputs; as in `_resolve_formula`, one string
        # result makes the whole layer categorical so rows aren't stored/rendered as a mix.
        if any(isinstance(value, str) for value in iter_all_values(result)):
            result = {year: {ou: str(value) for ou, value in by_ou.items()} for year, by_ou in result.items()}
        return result

    @staticmethod
    def _resolve_stack_order(node: dict, ports: Iterable[str]) -> List[str]:
        """Connected ports from lowest to highest priority.

        ``priorityOrder`` is a hint that can drift from the live connections, so it is reconciled
        rather than trusted: entries for ports that are no longer connected are dropped, duplicates
        collapse to their first occurrence, and any connected port the list doesn't mention is
        inserted at the LOWEST-priority end - a newly wired input then only fills gaps the other
        inputs leave, instead of silently overriding them.
        """
        connected = set(ports)
        raw = CompositeGraphEvaluator._get_control_value(node, "operation", "priorityOrder")
        ordered: List[str] = []
        if isinstance(raw, list):
            for entry in raw:
                if isinstance(entry, str) and entry in connected and entry not in ordered:
                    ordered.append(entry)
        missing = sorted(connected - set(ordered))
        return missing + ordered

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
                raise CompositeGraphIncompleteError("A reclassify rule is missing its category label.")
            threshold = raw_rule.get("value")
            if threshold is None or threshold == "":
                raise CompositeGraphIncompleteError(f"The reclassify rule for '{label}' is missing its value.")
            try:
                threshold = float(threshold)
            except (TypeError, ValueError):
                raise CompositeGraphError(f"The reclassify value '{threshold}' is not a number.")
            rules.append((CLASSIFY_OPERATORS[op], threshold, label))

        if not rules and not default_label:
            raise CompositeGraphIncompleteError("A reclassify node has no mappings.")
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
