from iaso.models.metric import MetricType, MetricValue
from iaso.test import TestCase
from plugins.snt_malaria.models import CompositeLayer
from plugins.snt_malaria.services.composite.evaluator import (
    CompositeGraphError,
    CompositeGraphEvaluator,
    CompositeGraphIncompleteError,
)
from plugins.snt_malaria.services.composite.graph import (
    OUTPUT_NODE_WIDTH,
    apply_legend_to_graph,
    is_runnable,
    seed_graph,
)
from plugins.snt_malaria.services.composite.persistence import (
    apply_composite_metadata,
    create_composite_metric_type,
    preview_composite_layer,
    run_and_persist_composite_layer,
    update_composite_metric_type,
)
from plugins.snt_malaria.tests.common_base import SNTMalariaTestMixin


def _data_layer_node(node_id, metric_type_id, output_targets):
    return {
        "id": node_id,
        "type": "dataLayer",
        "x": 0,
        "y": 0,
        "inputData": {"metricType": {"metricTypeId": metric_type_id}},
        "connections": {"inputs": {}, "outputs": {"values": output_targets}},
    }


def _formula_node(node_id, formula, input_sources, output_targets):
    return {
        "id": node_id,
        "type": "formula",
        "x": 0,
        "y": 0,
        "inputData": {"formula": {"formula": formula}},
        "connections": {"inputs": input_sources, "outputs": {"result": output_targets}},
    }


def _combine_node(node_id, input_sources, output_targets, operation=None):
    input_data = {}
    if operation is not None:
        input_data["operation"] = {"operation": operation}
    return {
        "id": node_id,
        "type": "combine",
        "x": 0,
        "y": 0,
        "inputData": input_data,
        "connections": {"inputs": input_sources, "outputs": {"result": output_targets}},
    }


def _normalize_node(node_id, input_sources, output_targets, scale=None, normalize_type=None):
    input_data = {}
    if scale is not None:
        input_data.setdefault("scale", {})["scale"] = scale
    if normalize_type is not None:
        input_data.setdefault("scale", {})["normalizeType"] = normalize_type
    return {
        "id": node_id,
        "type": "normalize",
        "x": 0,
        "y": 0,
        "inputData": input_data,
        "connections": {"inputs": input_sources, "outputs": {"result": output_targets}},
    }


def _classify_node(node_id, rules, default, input_sources, output_targets):
    return {
        "id": node_id,
        "type": "classify",
        "x": 0,
        "y": 0,
        "inputData": {"config": {"rules": {"rules": rules, "default": default}}},
        "connections": {"inputs": input_sources, "outputs": {"result": output_targets}},
    }


def _output_node(node_id, layer_source, legend_type=None, reference_metric_type_id=None, legend_config=None):
    input_data = {}
    if legend_type is not None:
        input_data["legend"] = {"legendType": legend_type}
    if legend_config is not None:
        input_data.setdefault("legend", {})["legendConfig"] = legend_config
    if reference_metric_type_id is not None:
        input_data["referenceLayer"] = {"referenceMetricTypeId": reference_metric_type_id}
    return {
        "id": node_id,
        "type": "output",
        "x": 0,
        "y": 0,
        "inputData": input_data,
        "connections": {"inputs": {"layer": layer_source}, "outputs": {}},
    }


class CompositeLayerEvaluatorTestCase(SNTMalariaTestMixin, TestCase):
    def setUp(self):
        super().setUp()
        self.org_unit_type = self.create_snt_org_unit_type(name="DISTRICT")
        self.ou1 = self.create_snt_org_unit(org_unit_type=self.org_unit_type, name="OU1")
        self.ou2 = self.create_snt_org_unit(org_unit_type=self.org_unit_type, name="OU2")

        self.metric_a = MetricType.objects.create(account=self.account, name="Layer A", code="layer_a")
        self.metric_b = MetricType.objects.create(account=self.account, name="Layer B", code="layer_b")

        MetricValue.objects.create(metric_type=self.metric_a, org_unit=self.ou1, year=None, value=2.0)
        MetricValue.objects.create(metric_type=self.metric_a, org_unit=self.ou2, year=None, value=4.0)
        MetricValue.objects.create(metric_type=self.metric_b, org_unit=self.ou1, year=None, value=3.0)
        MetricValue.objects.create(metric_type=self.metric_b, org_unit=self.ou2, year=None, value=5.0)

        self.org_unit_ids = [self.ou1.id, self.ou2.id]

    def _multiply_graph(
        self,
        formula="a * b",
        legend_type=None,
        reference_metric_type_id=None,
        legend_config=None,
    ):
        return {
            "layer1": _data_layer_node("layer1", self.metric_a.id, [{"nodeId": "formula1", "portName": "a"}]),
            "layer2": _data_layer_node("layer2", self.metric_b.id, [{"nodeId": "formula1", "portName": "b"}]),
            "formula1": _formula_node(
                "formula1",
                formula,
                {
                    "a": [{"nodeId": "layer1", "portName": "values"}],
                    "b": [{"nodeId": "layer2", "portName": "values"}],
                },
                [{"nodeId": "out", "portName": "layer"}],
            ),
            "out": _output_node(
                "out",
                [{"nodeId": "formula1", "portName": "result"}],
                legend_type=legend_type,
                reference_metric_type_id=reference_metric_type_id,
                legend_config=legend_config,
            ),
        }

    def test_evaluator_multiplies_layers_per_org_unit(self):
        values = CompositeGraphEvaluator(self.account, self._multiply_graph(), self.org_unit_ids).run()

        # All fixtures are year-less, so results live under the timeless (None) bucket.
        self.assertEqual(values, {None: {self.ou1.id: 6.0, self.ou2.id: 20.0}})

    def test_weighted_formula(self):
        values = CompositeGraphEvaluator(
            self.account, self._multiply_graph(formula="a * 0.5 + b"), self.org_unit_ids
        ).run()

        self.assertEqual(values, {None: {self.ou1.id: 4.0, self.ou2.id: 7.0}})

    def test_formula_outputs_string_label(self):
        # Numeric inputs, but the formula branches to text labels (a*b -> 6 and 20).
        graph = self._multiply_graph(formula='"HIGH" if a * b > 10 else "LOW"')
        values = CompositeGraphEvaluator(self.account, graph, self.org_unit_ids).run()
        self.assertEqual(values, {None: {self.ou1.id: "LOW", self.ou2.id: "HIGH"}})

    def test_formula_string_output_persists_as_ordinal(self):
        graph = self._multiply_graph(formula='"HIGH" if a * b > 10 else "LOW"')
        metric_type = run_and_persist_composite_layer(
            name="Risk score",
            account=self.account,
            graph=graph,
            org_unit_ids=self.org_unit_ids,
        )
        self.assertEqual(metric_type.legend_type, MetricType.LegendType.ORDINAL)
        rows = {mv.org_unit_id: mv for mv in MetricValue.objects.filter(metric_type=metric_type)}
        self.assertEqual(rows[self.ou1.id].string_value, "LOW")
        self.assertIsNone(rows[self.ou1.id].value)
        self.assertEqual(rows[self.ou2.id].string_value, "HIGH")

    def test_formula_accepts_string_input(self):
        # A categorical layer can feed a formula that compares/branches on its string values.
        seasonality = self._seasonality_layer()
        graph = {
            "layer1": _data_layer_node("layer1", seasonality.id, [{"nodeId": "formula1", "portName": "a"}]),
            "formula1": _formula_node(
                "formula1",
                '"WET" if a == "Peak" else "DRY"',
                {"a": [{"nodeId": "layer1", "portName": "values"}]},
                [{"nodeId": "out", "portName": "layer"}],
            ),
            "out": _output_node("out", [{"nodeId": "formula1", "portName": "result"}]),
        }
        values = CompositeGraphEvaluator(self.account, graph, self.org_unit_ids).run()
        self.assertEqual(values, {None: {self.ou1.id: "WET", self.ou2.id: "DRY"}})

    def test_formula_mixed_result_is_stringified(self):
        # One branch yields a number, the other a string -> the whole layer becomes text so rows
        # aren't a mix of numeric/string (metric_a: ou1=2 -> "2.0", ou2=4 -> "HIGH").
        graph = self._multiply_graph(formula='"HIGH" if a > 3 else a')
        values = CompositeGraphEvaluator(self.account, graph, self.org_unit_ids).run()
        self.assertEqual(values, {None: {self.ou1.id: "2.0", self.ou2.id: "HIGH"}})

    def test_single_char_string_literal_not_mistaken_for_input(self):
        # Single-char string literals ("a"/"b") must not be read as input-port references, even
        # though they collide with the port names (metric_a: ou1=2 -> "b", ou2=4 -> "a").
        graph = self._multiply_graph(formula='"a" if a > 3 else "b"')
        values = CompositeGraphEvaluator(self.account, graph, self.org_unit_ids).run()
        self.assertEqual(values, {None: {self.ou1.id: "b", self.ou2.id: "a"}})

    def test_formula_adds_numeric_strings_as_numbers(self):
        # Values stored as strings (string_value) must not be concatenated: "1" + "2" is 3, not "12".
        string_numbers = MetricType.objects.create(account=self.account, name="Scores", code="scores")
        MetricValue.objects.create(
            metric_type=string_numbers, org_unit=self.ou1, year=None, value=None, string_value="1"
        )
        MetricValue.objects.create(
            metric_type=string_numbers, org_unit=self.ou2, year=None, value=None, string_value="2"
        )

        graph = {
            "layer1": _data_layer_node("layer1", string_numbers.id, [{"nodeId": "formula1", "portName": "a"}]),
            "layer2": _data_layer_node("layer2", string_numbers.id, [{"nodeId": "formula1", "portName": "b"}]),
            "formula1": _formula_node(
                "formula1",
                "a + b",
                {
                    "a": [{"nodeId": "layer1", "portName": "values"}],
                    "b": [{"nodeId": "layer2", "portName": "values"}],
                },
                [{"nodeId": "out", "portName": "layer"}],
            ),
            "out": _output_node("out", [{"nodeId": "formula1", "portName": "result"}]),
        }
        values = CompositeGraphEvaluator(self.account, graph, self.org_unit_ids).run()
        self.assertEqual(values, {None: {self.ou1.id: 2.0, self.ou2.id: 4.0}})

    def test_formula_treats_numeric_classify_labels_as_numbers(self):
        # A reclassify node may emit numeric-looking score labels ("1"/"2"); arithmetic on them must
        # be numeric ("1" * 2 would otherwise be the string "11").
        graph = {
            "layer1": _data_layer_node("layer1", self.metric_a.id, [{"nodeId": "cls", "portName": "a"}]),
            "cls": _classify_node(
                "cls",
                rules=[{"op": "<", "value": 3, "label": "1"}],
                default="2",
                input_sources={"a": [{"nodeId": "layer1", "portName": "values"}]},
                output_targets=[{"nodeId": "formula1", "portName": "a"}],
            ),
            "formula1": _formula_node(
                "formula1",
                "a * 2",
                {"a": [{"nodeId": "cls", "portName": "result"}]},
                [{"nodeId": "out", "portName": "layer"}],
            ),
            "out": _output_node("out", [{"nodeId": "formula1", "portName": "result"}]),
        }
        # metric_a: ou1=2 -> label "1" -> 2.0; ou2=4 -> label "2" -> 4.0.
        values = CompositeGraphEvaluator(self.account, graph, self.org_unit_ids).run()
        self.assertEqual(values, {None: {self.ou1.id: 2.0, self.ou2.id: 4.0}})

    def test_run_and_persist_creates_metric_type_and_values(self):
        metric_type = run_and_persist_composite_layer(
            name="Risk score",
            account=self.account,
            graph=self._multiply_graph(),
            org_unit_ids=self.org_unit_ids,
        )

        self.assertEqual(metric_type.name, "Risk score")
        self.assertEqual(metric_type.category, "Composite")
        self.assertEqual(metric_type.origin, MetricType.MetricTypeOrigin.CUSTOM)
        self.assertEqual(metric_type.account, self.account)

        values = {mv.org_unit_id: mv.value for mv in MetricValue.objects.filter(metric_type=metric_type)}
        self.assertEqual(values, {self.ou1.id: 6.0, self.ou2.id: 20.0})

    def test_numeric_defaults_to_threshold_legend(self):
        metric_type = run_and_persist_composite_layer(
            name="Risk score",
            account=self.account,
            graph=self._multiply_graph(),
            org_unit_ids=self.org_unit_ids,
        )
        self.assertEqual(metric_type.legend_type, MetricType.LegendType.THRESHOLD)

    def test_selected_linear_legend_is_honored(self):
        metric_type = run_and_persist_composite_layer(
            name="Risk score",
            account=self.account,
            graph=self._multiply_graph(legend_type="linear"),
            org_unit_ids=self.org_unit_ids,
        )
        self.assertEqual(metric_type.legend_type, MetricType.LegendType.LINEAR)
        # A linear legend is a 2-stop scale: [low, high] with a matching pair of colours.
        # (values are {6.0, 20.0} -> domain is exactly the min and max)
        self.assertEqual(metric_type.legend_config["domain"], [6.0, 20.0])
        self.assertEqual(len(metric_type.legend_config["range"]), 2)

    def test_manual_legend_config_is_used_verbatim(self):
        # A concrete legend type with configured buckets is honoured instead of auto-computing them.
        manual = {"domain": [10, 20], "range": ["#aaaaaa", "#bbbbbb", "#cccccc"]}
        metric_type = run_and_persist_composite_layer(
            name="Risk score",
            account=self.account,
            graph=self._multiply_graph(legend_type="threshold", legend_config=manual),
            org_unit_ids=self.org_unit_ids,
        )
        self.assertEqual(metric_type.legend_type, MetricType.LegendType.THRESHOLD)
        self.assertEqual(metric_type.legend_config, manual)

    def test_manual_legend_config_ignored_when_incompatible_with_categorical(self):
        # A numeric manual legend can't render categorical output; fall back to the ordinal legend.
        manual = {"domain": [1, 2], "range": ["#aaaaaa", "#bbbbbb", "#cccccc"]}
        graph = self._classify_graph()
        graph["out"]["inputData"]["legend"] = {"legendType": "threshold", "legendConfig": manual}
        metric_type = run_and_persist_composite_layer(
            name="Bands",
            account=self.account,
            graph=graph,
            org_unit_ids=self.org_unit_ids,
        )
        self.assertEqual(metric_type.legend_type, MetricType.LegendType.ORDINAL)
        self.assertNotEqual(metric_type.legend_config, manual)

    def test_threshold_uses_interior_breakpoints_and_extra_colour(self):
        metric_type = run_and_persist_composite_layer(
            name="Risk score",
            account=self.account,
            graph=self._multiply_graph(),  # defaults to a threshold legend for numeric data
            org_unit_ids=self.org_unit_ids,
        )
        self.assertEqual(metric_type.legend_type, MetricType.LegendType.THRESHOLD)
        domain = metric_type.legend_config["domain"]
        colours = metric_type.legend_config["range"]
        # scaleThreshold needs one more colour than breakpoints.
        self.assertEqual(len(colours), len(domain) + 1)
        # Breakpoints are strictly interior to the data range (values are 6..20).
        self.assertTrue(all(6.0 < step < 20.0 for step in domain))
        self.assertEqual(domain, sorted(domain))

    def test_categorical_ignores_numeric_legend_choice(self):
        # Even if a numeric legend is requested, a categorical result must stay ordinal.
        graph = self._classify_graph()
        graph["out"]["inputData"]["legend"] = {"legendType": "linear"}
        metric_type = run_and_persist_composite_layer(
            name="Risk score",
            account=self.account,
            graph=graph,
            org_unit_ids=self.org_unit_ids,
        )
        self.assertEqual(metric_type.legend_type, MetricType.LegendType.ORDINAL)

    def test_preview_returns_values_without_persisting(self):
        before = MetricType.objects.count()

        result = preview_composite_layer(
            account=self.account,
            graph=self._multiply_graph(),
            org_unit_ids=self.org_unit_ids,
        )

        # Nothing was persisted.
        self.assertEqual(MetricType.objects.count(), before)
        self.assertFalse(CompositeLayer.objects.exists())

        self.assertEqual(result["legend_type"], MetricType.LegendType.THRESHOLD)
        self.assertIn("domain", result["legend_config"])
        values = {mv["org_unit"]: mv["value"] for mv in result["metric_values"]}
        self.assertEqual(values, {self.ou1.id: 6.0, self.ou2.id: 20.0})

    def test_preview_does_not_require_a_name(self):
        # The name is not part of the graph, nor of the preview result.
        result = preview_composite_layer(
            account=self.account,
            graph=self._multiply_graph(),
            org_unit_ids=self.org_unit_ids,
        )
        self.assertNotIn("name", result)
        self.assertEqual(len(result["metric_values"]), 2)

    def test_preview_categorical_returns_string_values(self):
        result = preview_composite_layer(
            account=self.account,
            graph=self._classify_graph(),
            org_unit_ids=self.org_unit_ids,
        )
        self.assertEqual(result["legend_type"], MetricType.LegendType.ORDINAL)
        values = {mv["org_unit"]: mv["string_value"] for mv in result["metric_values"]}
        self.assertEqual(values, {self.ou1.id: "LOW", self.ou2.id: "HIGH"})

    def test_reference_legend_copies_from_selected_layer(self):
        self.metric_a.legend_type = MetricType.LegendType.LINEAR
        self.metric_a.legend_config = {"domain": [0, 10], "range": ["#111111", "#222222"]}
        self.metric_a.save()

        metric_type = run_and_persist_composite_layer(
            name="Risk score",
            account=self.account,
            graph=self._multiply_graph(legend_type="reference", reference_metric_type_id=self.metric_a.id),
            org_unit_ids=self.org_unit_ids,
        )
        self.assertEqual(metric_type.legend_type, MetricType.LegendType.LINEAR)
        self.assertEqual(metric_type.legend_config, {"domain": [0, 10], "range": ["#111111", "#222222"]})

    def test_connected_data_layers_discovered_in_traversal_order(self):
        evaluator = CompositeGraphEvaluator(self.account, self._multiply_graph(), self.org_unit_ids)
        self.assertEqual(
            evaluator.connected_data_layer_metric_type_ids(),
            [self.metric_a.id, self.metric_b.id],
        )

    def test_reference_legend_defaults_to_first_connected_layer(self):
        # "reference" chosen but no explicit layer picked -> use the first connected layer (metric_a).
        self.metric_a.legend_type = MetricType.LegendType.LINEAR
        self.metric_a.legend_config = {"domain": [0, 10], "range": ["#111111", "#222222"]}
        self.metric_a.save()

        metric_type = run_and_persist_composite_layer(
            name="Risk score",
            account=self.account,
            graph=self._multiply_graph(legend_type="reference"),
            org_unit_ids=self.org_unit_ids,
        )
        self.assertEqual(metric_type.legend_type, MetricType.LegendType.LINEAR)
        self.assertEqual(metric_type.legend_config, {"domain": [0, 10], "range": ["#111111", "#222222"]})

    def test_reference_legend_falls_back_when_reference_missing(self):
        # An invalid/blank reference shouldn't break saving; fall back to the numeric default.
        metric_type = run_and_persist_composite_layer(
            name="Risk score",
            account=self.account,
            graph=self._multiply_graph(legend_type="reference", reference_metric_type_id=999999),
            org_unit_ids=self.org_unit_ids,
        )
        self.assertEqual(metric_type.legend_type, MetricType.LegendType.THRESHOLD)

    def test_categorical_ignores_reference_legend(self):
        # A numeric reference legend can't render category strings, so stay ordinal.
        self.metric_a.legend_type = MetricType.LegendType.LINEAR
        self.metric_a.legend_config = {"domain": [0, 10], "range": ["#111111", "#222222"]}
        self.metric_a.save()

        graph = self._classify_graph()
        graph["out"]["inputData"]["legend"] = {"legendType": "reference"}
        graph["out"]["inputData"]["referenceLayer"] = {"referenceMetricTypeId": self.metric_a.id}

        metric_type = run_and_persist_composite_layer(
            name="Risk score",
            account=self.account,
            graph=graph,
            org_unit_ids=self.org_unit_ids,
        )
        self.assertEqual(metric_type.legend_type, MetricType.LegendType.ORDINAL)

    def test_update_reruns_in_place_keeping_metric_type_id(self):
        metric_type = run_and_persist_composite_layer(
            name="Risk score",
            account=self.account,
            graph=self._multiply_graph(formula="a * b"),
            org_unit_ids=self.org_unit_ids,
        )
        original_id = metric_type.id

        updated = update_composite_metric_type(
            name="Score v2",
            account=self.account,
            metric_type=metric_type,
            graph=self._multiply_graph(formula="a + b"),
            org_unit_ids=self.org_unit_ids,
        )

        self.assertEqual(updated.id, original_id)
        self.assertEqual(updated.name, "Score v2")
        values = {mv.org_unit_id: mv.value for mv in MetricValue.objects.filter(metric_type=updated)}
        self.assertEqual(values, {self.ou1.id: 5.0, self.ou2.id: 9.0})
        # No duplicate values left behind after the re-run.
        self.assertEqual(MetricValue.objects.filter(metric_type=updated).count(), 2)

    def test_composite_can_be_used_as_input(self):
        composite = run_and_persist_composite_layer(
            name="Risk score",
            account=self.account,
            graph=self._multiply_graph(),
            org_unit_ids=self.org_unit_ids,
        )

        # Feed the freshly created composite back in as a data layer input.
        graph = {
            "layer1": _data_layer_node("layer1", composite.id, [{"nodeId": "formula1", "portName": "a"}]),
            "formula1": _formula_node(
                "formula1",
                "a + 1",
                {"a": [{"nodeId": "layer1", "portName": "values"}]},
                [{"nodeId": "out", "portName": "layer"}],
            ),
            "out": _output_node("out", [{"nodeId": "formula1", "portName": "result"}]),
        }
        values = CompositeGraphEvaluator(self.account, graph, self.org_unit_ids).run()
        self.assertEqual(values, {None: {self.ou1.id: 7.0, self.ou2.id: 21.0}})

    def test_data_layer_passes_through_all_years(self):
        # A multi-year source layer keeps every year (no collapse to a single "latest" value).
        # metric_a already has year-less values (ou1=2, ou2=4); add two real years for ou1.
        MetricValue.objects.create(metric_type=self.metric_a, org_unit=self.ou1, year=2024, value=50.0)
        MetricValue.objects.create(metric_type=self.metric_a, org_unit=self.ou1, year=2025, value=100.0)
        graph = {
            "layer1": _data_layer_node("layer1", self.metric_a.id, [{"nodeId": "out", "portName": "layer"}]),
            "out": _output_node("out", [{"nodeId": "layer1", "portName": "values"}]),
        }
        values = CompositeGraphEvaluator(self.account, graph, self.org_unit_ids).run()
        self.assertEqual(
            values,
            {
                None: {self.ou1.id: 2.0, self.ou2.id: 4.0},
                2024: {self.ou1.id: 50.0},
                2025: {self.ou1.id: 100.0},
            },
        )

    def _yearly_metric(self, code, values_by_year):
        metric = MetricType.objects.create(account=self.account, name=code, code=code)
        for year, by_ou in values_by_year.items():
            for org_unit, value in by_ou.items():
                MetricValue.objects.create(metric_type=metric, org_unit=org_unit, year=year, value=value)
        return metric

    def _two_layer_formula_graph(self, metric_id_a, metric_id_b, formula="a + b", legend_type=None):
        return {
            "layer1": _data_layer_node("layer1", metric_id_a, [{"nodeId": "formula1", "portName": "a"}]),
            "layer2": _data_layer_node("layer2", metric_id_b, [{"nodeId": "formula1", "portName": "b"}]),
            "formula1": _formula_node(
                "formula1",
                formula,
                {
                    "a": [{"nodeId": "layer1", "portName": "values"}],
                    "b": [{"nodeId": "layer2", "portName": "values"}],
                },
                [{"nodeId": "out", "portName": "layer"}],
            ),
            "out": _output_node("out", [{"nodeId": "formula1", "portName": "result"}], legend_type=legend_type),
        }

    def test_multi_year_formula_uses_year_overlap(self):
        # Two yearly layers with partial overlap -> only the shared year(s) survive.
        metric_c = self._yearly_metric(
            "layer_c", {2023: {self.ou1: 10.0, self.ou2: 1.0}, 2024: {self.ou1: 20.0, self.ou2: 2.0}}
        )
        metric_d = self._yearly_metric(
            "layer_d", {2024: {self.ou1: 3.0, self.ou2: 5.0}, 2025: {self.ou1: 4.0, self.ou2: 6.0}}
        )

        values = CompositeGraphEvaluator(
            self.account, self._two_layer_formula_graph(metric_c.id, metric_d.id, formula="a + b"), self.org_unit_ids
        ).run()

        # Overlap of {2023, 2024} and {2024, 2025} is {2024}.
        self.assertEqual(values, {2024: {self.ou1.id: 23.0, self.ou2.id: 7.0}})

    def test_timeless_input_broadcasts_across_years(self):
        # A year-less layer combined with a yearly layer broadcasts to each of the yearly layer's years.
        metric_c = self._yearly_metric(
            "layer_c", {2023: {self.ou1: 10.0, self.ou2: 1.0}, 2024: {self.ou1: 20.0, self.ou2: 2.0}}
        )
        # metric_a is timeless (ou1=2, ou2=4 under year=None).

        values = CompositeGraphEvaluator(
            self.account,
            self._two_layer_formula_graph(metric_c.id, self.metric_a.id, formula="a + b"),
            self.org_unit_ids,
        ).run()

        self.assertEqual(
            values,
            {
                2023: {self.ou1.id: 12.0, self.ou2.id: 5.0},
                2024: {self.ou1.id: 22.0, self.ou2.id: 6.0},
            },
        )

    def test_multi_year_persists_one_metric_value_per_year(self):
        metric_c = self._yearly_metric(
            "layer_c", {2023: {self.ou1: 10.0, self.ou2: 1.0}, 2024: {self.ou1: 20.0, self.ou2: 2.0}}
        )

        metric_type = run_and_persist_composite_layer(
            name="Risk score",
            account=self.account,
            graph=self._two_layer_formula_graph(metric_c.id, self.metric_a.id, formula="a + b"),
            org_unit_ids=self.org_unit_ids,
        )

        rows = {(mv.org_unit_id, mv.year): mv.value for mv in MetricValue.objects.filter(metric_type=metric_type)}
        self.assertEqual(
            rows,
            {
                (self.ou1.id, 2023): 12.0,
                (self.ou2.id, 2023): 5.0,
                (self.ou1.id, 2024): 22.0,
                (self.ou2.id, 2024): 6.0,
            },
        )

    def test_multi_year_shares_one_legend_across_years(self):
        # The legend spans every year's values (min 5 across 2023, max 22 across 2024).
        metric_c = self._yearly_metric(
            "layer_c", {2023: {self.ou1: 10.0, self.ou2: 1.0}, 2024: {self.ou1: 20.0, self.ou2: 2.0}}
        )

        metric_type = run_and_persist_composite_layer(
            name="Risk score",
            account=self.account,
            graph=self._two_layer_formula_graph(metric_c.id, self.metric_a.id, formula="a + b", legend_type="linear"),
            org_unit_ids=self.org_unit_ids,
        )
        self.assertEqual(metric_type.legend_type, MetricType.LegendType.LINEAR)
        # Domain is the global [min, max] across all years: 5.0 (ou2, 2023) .. 22.0 (ou1, 2024).
        self.assertEqual(metric_type.legend_config["domain"], [5.0, 22.0])

    def test_preview_returns_year_per_value_and_years_list(self):
        metric_c = self._yearly_metric(
            "layer_c", {2023: {self.ou1: 10.0, self.ou2: 1.0}, 2024: {self.ou1: 20.0, self.ou2: 2.0}}
        )

        result = preview_composite_layer(
            account=self.account,
            graph=self._two_layer_formula_graph(metric_c.id, self.metric_a.id, formula="a + b"),
            org_unit_ids=self.org_unit_ids,
        )

        # Years are listed newest-first.
        self.assertEqual(result["years"], [2024, 2023])
        by_year_ou = {(mv["year"], mv["org_unit"]): mv["value"] for mv in result["metric_values"]}
        self.assertEqual(by_year_ou[(2023, self.ou1.id)], 12.0)
        self.assertEqual(by_year_ou[(2024, self.ou1.id)], 22.0)

    def test_preview_timeless_graph_has_empty_years_list(self):
        # An all-timeless graph produces a single year=None layer and no year entries.
        result = preview_composite_layer(
            account=self.account,
            graph=self._multiply_graph(),
            org_unit_ids=self.org_unit_ids,
        )
        self.assertEqual(result["years"], [])
        self.assertTrue(all(mv["year"] is None for mv in result["metric_values"]))

    def _combine_graph(self, operation=None, metric_ids=None):
        metric_ids = metric_ids or [self.metric_a.id, self.metric_b.id]
        graph = {}
        input_sources = {}
        for index, metric_id in enumerate(metric_ids):
            port = chr(ord("a") + index)
            node_id = f"layer{index + 1}"
            graph[node_id] = _data_layer_node(node_id, metric_id, [{"nodeId": "comb", "portName": port}])
            input_sources[port] = [{"nodeId": node_id, "portName": "values"}]
        graph["comb"] = _combine_node(
            "comb",
            input_sources=input_sources,
            output_targets=[{"nodeId": "out", "portName": "layer"}],
            operation=operation,
        )
        graph["out"] = _output_node("out", [{"nodeId": "comb", "portName": "result"}])
        return graph

    # metric_a: ou1=2, ou2=4; metric_b: ou1=3, ou2=5.
    def test_combine_mean(self):
        values = CompositeGraphEvaluator(self.account, self._combine_graph(operation="mean"), self.org_unit_ids).run()
        self.assertEqual(values, {None: {self.ou1.id: 2.5, self.ou2.id: 4.5}})

    def test_combine_defaults_to_mean(self):
        values = CompositeGraphEvaluator(self.account, self._combine_graph(), self.org_unit_ids).run()
        self.assertEqual(values, {None: {self.ou1.id: 2.5, self.ou2.id: 4.5}})

    def test_combine_sum(self):
        values = CompositeGraphEvaluator(self.account, self._combine_graph(operation="sum"), self.org_unit_ids).run()
        self.assertEqual(values, {None: {self.ou1.id: 5.0, self.ou2.id: 9.0}})

    def test_combine_min(self):
        values = CompositeGraphEvaluator(self.account, self._combine_graph(operation="min"), self.org_unit_ids).run()
        self.assertEqual(values, {None: {self.ou1.id: 2.0, self.ou2.id: 4.0}})

    def test_combine_max(self):
        values = CompositeGraphEvaluator(self.account, self._combine_graph(operation="max"), self.org_unit_ids).run()
        self.assertEqual(values, {None: {self.ou1.id: 3.0, self.ou2.id: 5.0}})

    def test_combine_three_inputs(self):
        metric_c = MetricType.objects.create(account=self.account, name="Layer C", code="layer_c")
        MetricValue.objects.create(metric_type=metric_c, org_unit=self.ou1, year=None, value=10.0)
        MetricValue.objects.create(metric_type=metric_c, org_unit=self.ou2, year=None, value=0.0)

        values = CompositeGraphEvaluator(
            self.account,
            self._combine_graph(operation="mean", metric_ids=[self.metric_a.id, self.metric_b.id, metric_c.id]),
            self.org_unit_ids,
        ).run()
        self.assertEqual(values, {None: {self.ou1.id: 5.0, self.ou2.id: 3.0}})

    def test_combine_single_input_is_identity(self):
        values = CompositeGraphEvaluator(
            self.account, self._combine_graph(operation="mean", metric_ids=[self.metric_a.id]), self.org_unit_ids
        ).run()
        self.assertEqual(values, {None: {self.ou1.id: 2.0, self.ou2.id: 4.0}})

    def test_combine_aligns_years_with_timeless_broadcast(self):
        # A yearly layer combined with timeless metric_a: each year uses metric_a's single value.
        metric_c = self._yearly_metric(
            "layer_c",
            {2023: {self.ou1: 10.0, self.ou2: 20.0}, 2024: {self.ou1: 30.0, self.ou2: 40.0}},
        )
        values = CompositeGraphEvaluator(
            self.account,
            self._combine_graph(operation="sum", metric_ids=[metric_c.id, self.metric_a.id]),
            self.org_unit_ids,
        ).run()
        self.assertEqual(
            values,
            {
                2023: {self.ou1.id: 12.0, self.ou2.id: 24.0},
                2024: {self.ou1.id: 32.0, self.ou2.id: 44.0},
            },
        )

    def test_combine_categorical_input_raises(self):
        seasonality = self._seasonality_layer()
        with self.assertRaises(CompositeGraphError):
            CompositeGraphEvaluator(
                self.account,
                self._combine_graph(operation="mean", metric_ids=[self.metric_a.id, seasonality.id]),
                self.org_unit_ids,
            ).run()

    def test_combine_without_inputs_raises(self):
        graph = self._combine_graph(operation="mean")
        graph["comb"]["connections"]["inputs"] = {}
        with self.assertRaises(CompositeGraphError):
            CompositeGraphEvaluator(self.account, graph, self.org_unit_ids).run()

    def test_combine_unknown_operation_raises(self):
        with self.assertRaises(CompositeGraphError):
            CompositeGraphEvaluator(self.account, self._combine_graph(operation="median"), self.org_unit_ids).run()

    def _normalize_graph(self, metric_type_id=None, scale=None, normalize_type=None, name="Normalized"):
        return {
            "layer1": _data_layer_node(
                "layer1", metric_type_id or self.metric_a.id, [{"nodeId": "norm", "portName": "a"}]
            ),
            "norm": _normalize_node(
                "norm",
                input_sources={"a": [{"nodeId": "layer1", "portName": "values"}]},
                output_targets=[{"nodeId": "out", "portName": "layer"}],
                scale=scale,
                normalize_type=normalize_type,
            ),
            "out": _output_node("out", [{"nodeId": "norm", "portName": "result"}]),
        }

    def test_normalize_rescales_to_unit_range(self):
        # metric_a: ou1=2 (min -> 0), ou2=4 (max -> 1). Scale defaults to 0-1 when absent.
        values = CompositeGraphEvaluator(self.account, self._normalize_graph(), self.org_unit_ids).run()
        self.assertEqual(values, {None: {self.ou1.id: 0.0, self.ou2.id: 1.0}})

    def test_normalize_scale_100(self):
        ou3 = self.create_snt_org_unit(org_unit_type=self.org_unit_type, name="OU3")
        MetricValue.objects.create(metric_type=self.metric_a, org_unit=ou3, year=None, value=3.0)

        values = CompositeGraphEvaluator(
            self.account, self._normalize_graph(scale="100"), [*self.org_unit_ids, ou3.id]
        ).run()
        # min=2 -> 0, mid=3 -> 50, max=4 -> 100.
        self.assertEqual(values, {None: {self.ou1.id: 0.0, ou3.id: 50.0, self.ou2.id: 100.0}})

    def test_normalize_rescales_each_year_independently(self):
        # Each year uses its own min/max, so values express the position within that year.
        metric_c = self._yearly_metric(
            "layer_c",
            {2023: {self.ou1: 10.0, self.ou2: 20.0}, 2024: {self.ou1: 100.0, self.ou2: 300.0}},
        )
        values = CompositeGraphEvaluator(
            self.account, self._normalize_graph(metric_type_id=metric_c.id), self.org_unit_ids
        ).run()
        self.assertEqual(
            values,
            {
                2023: {self.ou1.id: 0.0, self.ou2.id: 1.0},
                2024: {self.ou1.id: 0.0, self.ou2.id: 1.0},
            },
        )

    def test_normalize_constant_input_maps_to_midpoint(self):
        constant = MetricType.objects.create(account=self.account, name="Constant", code="constant")
        MetricValue.objects.create(metric_type=constant, org_unit=self.ou1, year=None, value=7.0)
        MetricValue.objects.create(metric_type=constant, org_unit=self.ou2, year=None, value=7.0)

        values = CompositeGraphEvaluator(
            self.account, self._normalize_graph(metric_type_id=constant.id, scale="100"), self.org_unit_ids
        ).run()
        self.assertEqual(values, {None: {self.ou1.id: 50.0, self.ou2.id: 50.0}})

    def test_normalize_categorical_input_raises(self):
        seasonality = self._seasonality_layer()
        with self.assertRaises(CompositeGraphError):
            CompositeGraphEvaluator(
                self.account, self._normalize_graph(metric_type_id=seasonality.id), self.org_unit_ids
            ).run()

    def test_normalize_without_input_raises(self):
        graph = self._normalize_graph()
        graph["norm"]["connections"]["inputs"] = {}
        with self.assertRaises(CompositeGraphError):
            CompositeGraphEvaluator(self.account, graph, self.org_unit_ids).run()

    def test_normalize_invalid_scale_raises(self):
        with self.assertRaises(CompositeGraphError):
            CompositeGraphEvaluator(self.account, self._normalize_graph(scale="huge"), self.org_unit_ids).run()

    def test_normalize_invalid_type_raises(self):
        with self.assertRaises(CompositeGraphError):
            CompositeGraphEvaluator(
                self.account, self._normalize_graph(normalize_type="median"), self.org_unit_ids
            ).run()

    def _percentile_metric(self, values_by_org_unit):
        metric = MetricType.objects.create(account=self.account, name="Percentile input", code="percentile_input")
        for org_unit, value in values_by_org_unit.items():
            MetricValue.objects.create(metric_type=metric, org_unit=org_unit, year=None, value=value)
        return metric

    def test_normalize_percentile_ignores_outlier_magnitude(self):
        # [1, 2, 3, 100]: min-max would crush 1/2/3 near zero because 100 stretches the whole
        # scale. Percentile only cares about ordering, so the ranks are evenly spaced.
        ou3 = self.create_snt_org_unit(org_unit_type=self.org_unit_type, name="OU3")
        ou4 = self.create_snt_org_unit(org_unit_type=self.org_unit_type, name="OU4")
        metric = self._percentile_metric({self.ou1: 1.0, self.ou2: 2.0, ou3: 3.0, ou4: 100.0})

        values = CompositeGraphEvaluator(
            self.account,
            self._normalize_graph(metric_type_id=metric.id, normalize_type="percentile"),
            [self.ou1.id, self.ou2.id, ou3.id, ou4.id],
        ).run()
        rounded = {ou_id: round(float(value), 4) for ou_id, value in values[None].items()}
        self.assertEqual(
            rounded,
            {self.ou1.id: 0.0, self.ou2.id: 0.3333, ou3.id: 0.6667, ou4.id: 1.0},
        )

    def test_normalize_percentile_scale_100(self):
        ou3 = self.create_snt_org_unit(org_unit_type=self.org_unit_type, name="OU3")
        metric = self._percentile_metric({self.ou1: 5.0, self.ou2: 1.0, ou3: 10.0})

        values = CompositeGraphEvaluator(
            self.account,
            self._normalize_graph(metric_type_id=metric.id, scale="100", normalize_type="percentile"),
            [self.ou1.id, self.ou2.id, ou3.id],
        ).run()
        self.assertEqual(values, {None: {self.ou2.id: 0.0, self.ou1.id: 50.0, ou3.id: 100.0}})

    def test_normalize_percentile_ties_share_average_rank(self):
        # ou1 and ou2 are tied for the lowest two spots (ranks 0 and 1), so they share rank 0.5;
        # ou3 alone takes the top rank (2). Scaled by /(n-1) = /2.
        ou3 = self.create_snt_org_unit(org_unit_type=self.org_unit_type, name="OU3")
        metric = self._percentile_metric({self.ou1: 5.0, self.ou2: 5.0, ou3: 10.0})

        values = CompositeGraphEvaluator(
            self.account,
            self._normalize_graph(metric_type_id=metric.id, normalize_type="percentile"),
            [self.ou1.id, self.ou2.id, ou3.id],
        ).run()
        self.assertEqual(values, {None: {self.ou1.id: 0.25, self.ou2.id: 0.25, ou3.id: 1.0}})

    def test_normalize_percentile_ten_values_with_duplicates(self):
        # 10 values with two duplicate groups: 20 appears twice (ou4, ou9) and 40 appears three
        # times (ou1, ou7, ou10). Sorted: 10, 20, 20, 30, 40, 40, 40, 50, 60, 100 -> ranks
        # 0, 1.5, 1.5, 3, 5, 5, 5, 7, 8, 9 (ties share the average of the positions they span).
        # Scaled by /(n-1) = /9, every duplicate group lands on exactly the same output value,
        # regardless of how far apart the duplicated values themselves are (20 vs 40).
        extra_org_units = [
            self.create_snt_org_unit(org_unit_type=self.org_unit_type, name=f"OU{i}") for i in range(3, 11)
        ]
        ou3, ou4, ou5, ou6, ou7, ou8, ou9, ou10 = extra_org_units
        values = {
            self.ou1: 40.0,
            self.ou2: 10.0,
            ou3: 60.0,
            ou4: 20.0,
            ou5: 100.0,
            ou6: 30.0,
            ou7: 40.0,
            ou8: 50.0,
            ou9: 20.0,
            ou10: 40.0,
        }
        metric = self._percentile_metric(values)

        result = CompositeGraphEvaluator(
            self.account,
            self._normalize_graph(metric_type_id=metric.id, normalize_type="percentile"),
            [org_unit.id for org_unit in values],
        ).run()
        rounded = {org_unit_id: round(float(value), 4) for org_unit_id, value in result[None].items()}
        self.assertEqual(
            rounded,
            {
                self.ou2.id: 0.0,  # 10 -> lowest, unique -> rank 0/9
                ou4.id: 0.1667,  # 20 -> tied with ou9 -> average rank 1.5/9
                ou9.id: 0.1667,  # 20 -> tied with ou4
                ou6.id: 0.3333,  # 30 -> unique -> rank 3/9
                self.ou1.id: 0.5556,  # 40 -> tied with ou7, ou10 -> average rank 5/9
                ou7.id: 0.5556,  # 40 -> tied
                ou10.id: 0.5556,  # 40 -> tied
                ou8.id: 0.7778,  # 50 -> unique -> rank 7/9
                ou3.id: 0.8889,  # 60 -> unique -> rank 8/9
                ou5.id: 1.0,  # 100 -> highest, unique -> rank 9/9
            },
        )
        # The three 40s and the two 20s land on exactly the same value, even though a 40 is twice
        # as far from a 20 as a 20 is from the minimum: percentile only cares about order.
        self.assertEqual(rounded[self.ou1.id], rounded[ou7.id])
        self.assertEqual(rounded[self.ou1.id], rounded[ou10.id])
        self.assertEqual(rounded[ou4.id], rounded[ou9.id])

    def test_normalize_percentile_single_value_maps_to_midpoint(self):
        metric = self._percentile_metric({self.ou1: 42.0})

        values = CompositeGraphEvaluator(
            self.account,
            self._normalize_graph(metric_type_id=metric.id, scale="100", normalize_type="percentile"),
            [self.ou1.id],
        ).run()
        self.assertEqual(values, {None: {self.ou1.id: 50.0}})

    def _classify_graph(self, name="Risk band"):
        # metric_a: ou1=2, ou2=4  ->  < 3 = LOW, else HIGH
        return {
            "layer1": _data_layer_node("layer1", self.metric_a.id, [{"nodeId": "cls", "portName": "a"}]),
            "cls": _classify_node(
                "cls",
                rules=[{"op": "<", "value": 3, "label": "LOW"}],
                default="HIGH",
                input_sources={"a": [{"nodeId": "layer1", "portName": "values"}]},
                output_targets=[{"nodeId": "out", "portName": "layer"}],
            ),
            "out": _output_node("out", [{"nodeId": "cls", "portName": "result"}]),
        }

    def test_classify_maps_input_to_categories(self):
        values = CompositeGraphEvaluator(self.account, self._classify_graph(), self.org_unit_ids).run()
        self.assertEqual(values, {None: {self.ou1.id: "LOW", self.ou2.id: "HIGH"}})

    def test_classify_persists_as_ordinal_string_values(self):
        metric_type = run_and_persist_composite_layer(
            name="Risk score",
            account=self.account,
            graph=self._classify_graph(),
            org_unit_ids=self.org_unit_ids,
        )

        self.assertEqual(metric_type.legend_type, MetricType.LegendType.ORDINAL)
        # Legend domain keeps the declared rule order (rules first, then the default).
        self.assertEqual(metric_type.legend_config["domain"], ["LOW", "HIGH"])
        self.assertEqual(len(metric_type.legend_config["range"]), 2)

        rows = {mv.org_unit_id: mv for mv in MetricValue.objects.filter(metric_type=metric_type)}
        self.assertEqual(rows[self.ou1.id].string_value, "LOW")
        self.assertIsNone(rows[self.ou1.id].value)
        self.assertEqual(rows[self.ou2.id].string_value, "HIGH")

    def _seasonality_layer(self):
        seasonality = MetricType.objects.create(
            account=self.account,
            name="Seasonality",
            code="seasonality",
            legend_type=MetricType.LegendType.ORDINAL,
            legend_config={"domain": ["Peak", "Low"], "range": ["#111111", "#222222"]},
        )
        MetricValue.objects.create(
            metric_type=seasonality, org_unit=self.ou1, year=None, value=None, string_value="Peak"
        )
        MetricValue.objects.create(
            metric_type=seasonality, org_unit=self.ou2, year=None, value=None, string_value="Low"
        )
        return seasonality

    def test_categorical_data_layer_resolves_to_string_values(self):
        # Categorical layers store their category in string_value with a null value.
        seasonality = self._seasonality_layer()
        graph = {
            "layer1": _data_layer_node("layer1", seasonality.id, [{"nodeId": "out", "portName": "layer"}]),
            "out": _output_node("out", [{"nodeId": "layer1", "portName": "values"}]),
        }
        values = CompositeGraphEvaluator(self.account, graph, self.org_unit_ids).run()
        self.assertEqual(values, {None: {self.ou1.id: "Peak", self.ou2.id: "Low"}})

    def test_categorical_data_layer_persists_ordinal_keeping_source_order(self):
        seasonality = self._seasonality_layer()
        graph = {
            "layer1": _data_layer_node("layer1", seasonality.id, [{"nodeId": "out", "portName": "layer"}]),
            "out": _output_node("out", [{"nodeId": "layer1", "portName": "values"}]),
        }
        metric_type = run_and_persist_composite_layer(
            name="Risk score",
            account=self.account,
            graph=graph,
            org_unit_ids=self.org_unit_ids,
        )
        self.assertEqual(metric_type.legend_type, MetricType.LegendType.ORDINAL)
        # The source layer's own category order is preserved (not sorted alphabetically).
        self.assertEqual(metric_type.legend_config["domain"], ["Peak", "Low"])

    def test_reference_legend_copies_ordinal_base_layer_colours(self):
        seasonality = self._seasonality_layer()
        graph = {
            "layer1": _data_layer_node("layer1", seasonality.id, [{"nodeId": "out", "portName": "layer"}]),
            "out": _output_node(
                "out",
                [{"nodeId": "layer1", "portName": "values"}],
                legend_type="reference",
                reference_metric_type_id=seasonality.id,
            ),
        }
        metric_type = run_and_persist_composite_layer(
            name="Risk score",
            account=self.account,
            graph=graph,
            org_unit_ids=self.org_unit_ids,
        )
        self.assertEqual(metric_type.legend_type, MetricType.LegendType.ORDINAL)
        # Exact colours are copied from the referenced ordinal layer, not rebuilt with defaults.
        self.assertEqual(metric_type.legend_config, seasonality.legend_config)

    def test_arithmetic_on_string_input_raises(self):
        # A categorical layer may now feed a formula, but doing arithmetic on it (e.g. `a + 1` on
        # "LOW"/"HIGH") is a type error, surfaced as a CompositeGraphError rather than silent junk.
        graph = {
            "layer1": _data_layer_node("layer1", self.metric_a.id, [{"nodeId": "cls", "portName": "a"}]),
            "cls": _classify_node(
                "cls",
                rules=[{"op": "<", "value": 3, "label": "LOW"}],
                default="HIGH",
                input_sources={"a": [{"nodeId": "layer1", "portName": "values"}]},
                output_targets=[{"nodeId": "formula1", "portName": "a"}],
            ),
            "formula1": _formula_node(
                "formula1",
                "a + 1",
                {"a": [{"nodeId": "cls", "portName": "result"}]},
                [{"nodeId": "out", "portName": "layer"}],
            ),
            "out": _output_node("out", [{"nodeId": "formula1", "portName": "result"}]),
        }
        with self.assertRaises(CompositeGraphError):
            CompositeGraphEvaluator(self.account, graph, self.org_unit_ids).run()

    def test_formula_sums_numeric_classify_labels(self):
        # Classify labels can be numeric-looking strings (e.g. "1"/"2"); a downstream formula must
        # add them as numbers (3.0), not concatenate them as text ("12").
        graph = {
            "layer1": _data_layer_node("layer1", self.metric_a.id, [{"nodeId": "cls", "portName": "a"}]),
            "cls": _classify_node(
                "cls",
                rules=[{"op": "<", "value": 3, "label": "1"}],
                default="2",
                input_sources={"a": [{"nodeId": "layer1", "portName": "values"}]},
                output_targets=[{"nodeId": "formula1", "portName": "a"}],
            ),
            "formula1": _formula_node(
                "formula1",
                "a + 1",
                {"a": [{"nodeId": "cls", "portName": "result"}]},
                [{"nodeId": "out", "portName": "layer"}],
            ),
            "out": _output_node("out", [{"nodeId": "formula1", "portName": "result"}]),
        }
        # metric_a: ou1=2.0 -> classify "<3" matches -> "1" -> formula "1" + 1 == 2.0
        #           ou2=4.0 -> no rule matches -> default "2" -> formula "2" + 1 == 3.0
        values = CompositeGraphEvaluator(self.account, graph, self.org_unit_ids).run()
        self.assertEqual(values[None], {self.ou1.id: 2.0, self.ou2.id: 3.0})

    def test_classify_without_mappings_raises(self):
        graph = {
            "layer1": _data_layer_node("layer1", self.metric_a.id, [{"nodeId": "cls", "portName": "a"}]),
            "cls": _classify_node(
                "cls",
                rules=[],
                default="",
                input_sources={"a": [{"nodeId": "layer1", "portName": "values"}]},
                output_targets=[{"nodeId": "out", "portName": "layer"}],
            ),
            "out": _output_node("out", [{"nodeId": "cls", "portName": "result"}]),
        }
        with self.assertRaises(CompositeGraphError):
            CompositeGraphEvaluator(self.account, graph, self.org_unit_ids).run()

    def test_missing_output_node_raises(self):
        graph = {
            "layer1": _data_layer_node("layer1", self.metric_a.id, []),
        }
        with self.assertRaises(CompositeGraphError):
            CompositeGraphEvaluator(self.account, graph, self.org_unit_ids).run()

    def test_cycle_is_detected(self):
        graph = {
            "formula1": _formula_node(
                "formula1",
                "a",
                {"a": [{"nodeId": "formula2", "portName": "result"}]},
                [{"nodeId": "formula2", "portName": "a"}],
            ),
            "formula2": _formula_node(
                "formula2",
                "a",
                {"a": [{"nodeId": "formula1", "portName": "result"}]},
                [{"nodeId": "out", "portName": "layer"}],
            ),
            "out": _output_node("out", [{"nodeId": "formula2", "portName": "result"}]),
        }
        with self.assertRaises(CompositeGraphError):
            CompositeGraphEvaluator(self.account, graph, self.org_unit_ids).run()

    def test_formula_referencing_unconnected_input_raises(self):
        graph = {
            "layer1": _data_layer_node("layer1", self.metric_a.id, [{"nodeId": "formula1", "portName": "a"}]),
            "formula1": _formula_node(
                "formula1",
                "a * b",  # b is not connected
                {"a": [{"nodeId": "layer1", "portName": "values"}]},
                [{"nodeId": "out", "portName": "layer"}],
            ),
            "out": _output_node("out", [{"nodeId": "formula1", "portName": "result"}]),
        }
        with self.assertRaises(CompositeGraphError):
            CompositeGraphEvaluator(self.account, graph, self.org_unit_ids).run()


class CompositeGraphHelpersTestCase(TestCase):
    """Structural graph helpers: no database, no evaluation."""

    def _connected_graph(self, layer_source=None):
        return {
            "layer1": _data_layer_node("layer1", 1, [{"nodeId": "out", "portName": "layer"}]),
            "out": _output_node("out", layer_source if layer_source is not None else []),
        }

    def test_is_runnable(self):
        self.assertFalse(is_runnable(None))
        self.assertFalse(is_runnable("not a graph"))
        self.assertFalse(is_runnable({}))
        self.assertFalse(is_runnable({"layer1": _data_layer_node("layer1", 1, [])}))
        self.assertFalse(is_runnable(self._connected_graph()))
        self.assertTrue(is_runnable(self._connected_graph([{"nodeId": "layer1", "portName": "values"}])))

        two_outputs = self._connected_graph([{"nodeId": "layer1", "portName": "values"}])
        two_outputs["out2"] = _output_node("out2", [{"nodeId": "layer1", "portName": "values"}])
        self.assertFalse(is_runnable(two_outputs))

    def test_seed_graph_carries_the_legend(self):
        graph = seed_graph(CompositeLayer.LegendType.AUTO)
        self.assertEqual(list(graph), ["output"])
        output_node = graph["output"]
        self.assertEqual(output_node["type"], "output")
        self.assertEqual(output_node["width"], OUTPUT_NODE_WIDTH)
        self.assertEqual(output_node["connections"], {"inputs": {}, "outputs": {}})
        self.assertEqual(output_node["inputData"]["legend"], {"legendType": "auto"})

    def test_apply_legend_keeps_manual_config_for_a_concrete_type(self):
        legend_config = {"domain": [1, 2], "range": ["#aaaaaa", "#bbbbbb"]}
        graph = apply_legend_to_graph({}, CompositeLayer.LegendType.THRESHOLD, legend_config)
        self.assertEqual(
            graph["output"]["inputData"]["legend"],
            {"legendType": "threshold", "legendConfig": legend_config},
        )

    def test_apply_legend_drops_manual_config_for_auto_and_reference(self):
        legend_config = {"domain": [1, 2], "range": ["#aaaaaa", "#bbbbbb"]}
        graph = apply_legend_to_graph({}, CompositeLayer.LegendType.THRESHOLD, legend_config)

        graph = apply_legend_to_graph(graph, CompositeLayer.LegendType.AUTO, legend_config)
        self.assertEqual(graph["output"]["inputData"]["legend"], {"legendType": "auto"})

        graph = apply_legend_to_graph(graph, CompositeLayer.LegendType.REFERENCE, legend_config, 42)
        self.assertEqual(graph["output"]["inputData"]["legend"], {"legendType": "reference"})
        self.assertEqual(graph["output"]["inputData"]["referenceLayer"], {"referenceMetricTypeId": 42})

    def test_apply_legend_preserves_the_rest_of_the_graph(self):
        original = self._connected_graph([{"nodeId": "layer1", "portName": "values"}])
        original["out"]["inputData"]["preview"] = {"expanded": True}
        original["out"]["x"] = 120

        graph = apply_legend_to_graph(original, CompositeLayer.LegendType.LINEAR)

        self.assertEqual(sorted(graph), ["layer1", "out"])
        self.assertEqual(graph["out"]["x"], 120)
        self.assertEqual(graph["out"]["inputData"]["preview"], {"expanded": True})
        self.assertEqual(graph["out"]["connections"], original["out"]["connections"])
        # The input graph is left untouched.
        self.assertNotIn("legend", original["out"]["inputData"])


class CompositeMetricTypeTestCase(SNTMalariaTestMixin, TestCase):
    def test_create_without_values_uses_a_placeholder_legend(self):
        metric_type = create_composite_metric_type(self.account, name="Empty")

        self.assertEqual(metric_type.name, "Empty")
        self.assertEqual(metric_type.category, "Composite")
        self.assertEqual(metric_type.origin, MetricType.MetricTypeOrigin.CUSTOM)
        self.assertEqual(metric_type.source, "composite-layer-editor")
        self.assertEqual(metric_type.metric_kind, MetricType.MetricKind.ANY)
        self.assertEqual(metric_type.legend_type, MetricType.LegendType.THRESHOLD)
        self.assertEqual(metric_type.legend_config["domain"], [])
        self.assertEqual(MetricValue.objects.filter(metric_type=metric_type).count(), 0)

    def test_create_keeps_a_concrete_legend(self):
        legend_config = {"domain": ["Low", "High"], "range": ["#aaaaaa", "#bbbbbb"]}
        metric_type = create_composite_metric_type(
            self.account,
            name="Manual",
            legend_type=MetricType.LegendType.ORDINAL,
            legend_config=legend_config,
            is_population=True,
        )

        self.assertEqual(metric_type.legend_type, MetricType.LegendType.ORDINAL)
        self.assertEqual(metric_type.legend_config, legend_config)
        self.assertEqual(metric_type.metric_kind, MetricType.MetricKind.POPULATION)

    def test_create_generates_unique_codes_for_the_same_name(self):
        first = create_composite_metric_type(self.account, name="Same name")
        second = create_composite_metric_type(self.account, name="Same name")
        self.assertNotEqual(first.code, second.code)

    def test_apply_metadata_only_touches_provided_fields(self):
        metric_type = create_composite_metric_type(self.account, name="Before", units="mm")

        apply_composite_metadata(metric_type, name="After", category="Epidemiology")

        metric_type.refresh_from_db()
        self.assertEqual(metric_type.name, "After")
        self.assertEqual(metric_type.category, "Epidemiology")
        self.assertEqual(metric_type.units, "mm")

    def test_apply_metadata_ignores_a_legend_that_needs_a_run(self):
        metric_type = create_composite_metric_type(self.account, name="Layer")
        legend_config = {"domain": [1, 2], "range": ["#aaaaaa", "#bbbbbb"]}

        apply_composite_metadata(metric_type, legend_type=CompositeLayer.LegendType.AUTO, legend_config=legend_config)
        metric_type.refresh_from_db()
        self.assertEqual(metric_type.legend_config["domain"], [])

        apply_composite_metadata(metric_type, legend_type=MetricType.LegendType.LINEAR, legend_config=legend_config)
        metric_type.refresh_from_db()
        self.assertEqual(metric_type.legend_type, MetricType.LegendType.LINEAR)
        self.assertEqual(metric_type.legend_config, legend_config)


class CompositeGraphErrorClassificationTestCase(SNTMalariaTestMixin, TestCase):
    """An unfinished graph is saveable; a broken one is an error."""

    def setUp(self):
        super().setUp()
        self.org_unit_type = self.create_snt_org_unit_type(name="DISTRICT")
        self.ou1 = self.create_snt_org_unit(org_unit_type=self.org_unit_type, name="OU1")
        self.metric_a = MetricType.objects.create(account=self.account, name="Layer A", code="layer_a")
        MetricValue.objects.create(metric_type=self.metric_a, org_unit=self.ou1, year=None, value=2.0)
        self.org_unit_ids = [self.ou1.id]

    def _run(self, graph):
        CompositeGraphEvaluator(self.account, graph, self.org_unit_ids).run()

    def assertIncomplete(self, graph):
        with self.assertRaises(CompositeGraphIncompleteError):
            self._run(graph)

    def assertBroken(self, graph):
        with self.assertRaises(CompositeGraphError) as context:
            self._run(graph)
        self.assertNotIsInstance(context.exception, CompositeGraphIncompleteError)

    def test_unfinished_graphs_are_incomplete(self):
        self.assertIncomplete({})
        self.assertIncomplete({"layer1": _data_layer_node("layer1", self.metric_a.id, [])})
        self.assertIncomplete({"out": _output_node("out", [])})
        self.assertIncomplete(
            {
                "layer1": _data_layer_node("layer1", None, [{"nodeId": "out", "portName": "layer"}]),
                "out": _output_node("out", [{"nodeId": "layer1", "portName": "values"}]),
            }
        )
        self.assertIncomplete(
            {
                "formula1": _formula_node("formula1", "a", {}, [{"nodeId": "out", "portName": "layer"}]),
                "out": _output_node("out", [{"nodeId": "formula1", "portName": "result"}]),
            }
        )

    def test_broken_graphs_are_errors(self):
        # Unknown node type.
        self.assertBroken(
            {
                "weird": {
                    "id": "weird",
                    "type": "wat",
                    "x": 0,
                    "y": 0,
                    "inputData": {},
                    "connections": {"inputs": {}, "outputs": {}},
                },
                "out": _output_node("out", [{"nodeId": "weird", "portName": "result"}]),
            }
        )
        # Invalid formula.
        self.assertBroken(
            {
                "layer1": _data_layer_node("layer1", self.metric_a.id, [{"nodeId": "formula1", "portName": "a"}]),
                "formula1": _formula_node(
                    "formula1",
                    "a *",
                    {"a": [{"nodeId": "layer1", "portName": "values"}]},
                    [{"nodeId": "out", "portName": "layer"}],
                ),
                "out": _output_node("out", [{"nodeId": "formula1", "portName": "result"}]),
            }
        )
