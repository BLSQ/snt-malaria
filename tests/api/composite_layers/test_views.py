from django.contrib.gis.geos import MultiPolygon, Point, Polygon
from rest_framework import status

from iaso.models import MetricType, MetricValue, OrgUnit
from plugins.snt_malaria.models import CompositeLayer
from plugins.snt_malaria.permissions import SNT_SETTINGS_READ_PERMISSION, SNT_SETTINGS_WRITE_PERMISSION
from plugins.snt_malaria.tests.common_base import SNTMalariaAPITestCase


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


def _output_node(node_id, layer_source, input_data=None):
    return {
        "id": node_id,
        "type": "output",
        "x": 0,
        "y": 0,
        "inputData": input_data or {},
        "connections": {"inputs": {"layer": layer_source}, "outputs": {}},
    }


class CompositeLayerAPITestCase(SNTMalariaAPITestCase):
    BASE_URL = "/api/snt_malaria/composite_layers/"

    auto_create_account = False

    def setUp(self):
        super().setUp()
        self.account, self.source, self.version, self.project = self.create_account_datasource_version_project(
            "source", "Test Account", "project"
        )
        self.user = self.create_user_with_profile(
            username="user", account=self.account, permissions=[SNT_SETTINGS_WRITE_PERMISSION]
        )
        self.user_read = self.create_user_with_profile(
            username="user_read", account=self.account, permissions=[SNT_SETTINGS_READ_PERMISSION]
        )
        self.user_no_perms = self.create_user_with_profile(
            username="user_no_perms", account=self.account, permissions=[]
        )

        point = Point(x=4, y=50, z=100)
        multipolygon = MultiPolygon(Polygon([[-1.3, 2.5], [-1.7, 2.8], [-1.1, 4.1], [-1.3, 2.5]]))
        org_unit_type = self.create_snt_org_unit_type(name="DISTRICT")
        self.district_1 = self.create_snt_org_unit(
            org_unit_type=org_unit_type,
            name="District 1",
            version=self.version,
            validation_status=OrgUnit.VALIDATION_VALID,
            location=point,
            geom=multipolygon,
        )
        self.district_2 = self.create_snt_org_unit(
            org_unit_type=org_unit_type,
            name="District 2",
            version=self.version,
            validation_status=OrgUnit.VALIDATION_VALID,
            location=point,
            geom=multipolygon,
        )

        self.metric_a = MetricType.objects.create(account=self.account, name="Layer A", code="layer_a")
        self.metric_b = MetricType.objects.create(account=self.account, name="Layer B", code="layer_b")
        MetricValue.objects.create(metric_type=self.metric_a, org_unit=self.district_1, year=None, value=2.0)
        MetricValue.objects.create(metric_type=self.metric_a, org_unit=self.district_2, year=None, value=4.0)
        MetricValue.objects.create(metric_type=self.metric_b, org_unit=self.district_1, year=None, value=3.0)
        MetricValue.objects.create(metric_type=self.metric_b, org_unit=self.district_2, year=None, value=5.0)

        # Other account, for tenancy tests.
        self.other_account, _, self.other_version, _ = self.create_account_datasource_version_project(
            "other source", "Other Account", "other project"
        )
        self.other_user = self.create_user_with_profile(username="other_user", account=self.other_account)
        self.other_composite_layer = CompositeLayer.objects.create(
            account=self.other_account,
            name="Other composite",
            graph={},
            created_by=self.other_user,
        )

    def _multiply_graph(self, formula="a * b"):
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
            "out": _output_node("out", [{"nodeId": "formula1", "portName": "result"}]),
        }

    def _create_composite_layer(self, name="Risk score"):
        """Create a composite layer through the API and return the model instance."""
        self.client.force_authenticate(user=self.user)
        response = self.client.post(self.BASE_URL, {"graph": self._multiply_graph(), "name": name}, format="json")
        result = self.assertJSONResponse(response, status.HTTP_201_CREATED)
        return CompositeLayer.objects.get(id=result["id"])

    def test_create_composite_layer(self):
        self.client.force_authenticate(user=self.user)
        payload = {
            "graph": self._multiply_graph(),
            "comments": {"c1": {"id": "c1", "text": "note"}},
            "name": "Risk score",
            "category": "Epidemiology",
            "description": "A risk score",
            "units": "per 1000",
            "unit_symbol": "/k",
        }
        response = self.client.post(self.BASE_URL, payload, format="json")
        result = self.assertJSONResponse(response, status.HTTP_201_CREATED)

        composite_layer = CompositeLayer.objects.get(id=result["id"])
        self.assertEqual(composite_layer.account, self.account)
        self.assertEqual(composite_layer.name, "Risk score")
        self.assertEqual(composite_layer.comments, payload["comments"])
        self.assertEqual(composite_layer.created_by, self.user)

        metric_type = composite_layer.metric_type
        self.assertIsNotNone(metric_type)
        self.assertEqual(metric_type.name, "Risk score")
        self.assertEqual(metric_type.category, "Epidemiology")
        self.assertEqual(metric_type.description, "A risk score")
        self.assertEqual(metric_type.units, "per 1000")
        self.assertEqual(metric_type.unit_symbol, "/k")
        values = {mv.org_unit_id: mv.value for mv in MetricValue.objects.filter(metric_type=metric_type)}
        self.assertEqual(values, {self.district_1.id: 6.0, self.district_2.id: 20.0})

        self.assertEqual(result["name"], "Risk score")
        self.assertEqual(result["metric_type"], metric_type.id)
        self.assertEqual(result["metric_type_detail"]["id"], metric_type.id)
        self.assertEqual(result["created_by"]["id"], self.user.id)

    def test_create_defaults_category_to_composite(self):
        composite_layer = self._create_composite_layer()
        self.assertEqual(composite_layer.metric_type.category, "Composite")
        self.assertEqual(composite_layer.metric_type.metric_kind, MetricType.MetricKind.ANY)

    def test_create_population_composite(self):
        self.client.force_authenticate(user=self.user)
        payload = {"graph": self._multiply_graph(), "name": "Pop composite", "is_population": True}
        response = self.client.post(self.BASE_URL, payload, format="json")
        result = self.assertJSONResponse(response, status.HTTP_201_CREATED)
        composite_layer = CompositeLayer.objects.get(id=result["id"])
        self.assertEqual(composite_layer.metric_type.metric_kind, MetricType.MetricKind.POPULATION)

    def test_create_without_graph_creates_layer_without_values(self):
        """A layer can be created before its graph exists, so it is a real record from the start."""
        self.client.force_authenticate(user=self.user)
        payload = {"name": "Empty composite", "category": "Composite", "legend_type": "auto"}
        response = self.client.post(self.BASE_URL, payload, format="json")
        result = self.assertJSONResponse(response, status.HTTP_201_CREATED)

        composite_layer = CompositeLayer.objects.get(id=result["id"])
        self.assertEqual(composite_layer.legend_type, CompositeLayer.LegendType.AUTO)
        self.assertEqual(composite_layer.legend_config, {})

        # Seeded with the output node the graph is built from.
        self.assertEqual(list(composite_layer.graph), ["output"])
        output_node = composite_layer.graph["output"]
        self.assertEqual(output_node["type"], "output")
        self.assertEqual(output_node["inputData"]["legend"], {"legendType": "auto"})

        metric_type = composite_layer.metric_type
        self.assertIsNotNone(metric_type)
        self.assertEqual(metric_type.name, "Empty composite")
        self.assertTrue(metric_type.code.startswith("composite_"))
        self.assertEqual(metric_type.legend_type, MetricType.LegendType.THRESHOLD)
        self.assertEqual(metric_type.legend_config["domain"], [])
        self.assertEqual(MetricValue.objects.filter(metric_type=metric_type).count(), 0)

        self.assertEqual(result["legend_type"], "auto")

    def test_create_with_concrete_legend_stores_manual_config(self):
        self.client.force_authenticate(user=self.user)
        legend_config = {"domain": ["Low", "High"], "range": ["#aaaaaa", "#bbbbbb"]}
        payload = {"name": "Manual legend", "legend_type": "ordinal", "legend_config": legend_config}
        response = self.client.post(self.BASE_URL, payload, format="json")
        result = self.assertJSONResponse(response, status.HTTP_201_CREATED)

        composite_layer = CompositeLayer.objects.get(id=result["id"])
        self.assertEqual(composite_layer.legend_type, MetricType.LegendType.ORDINAL)
        self.assertEqual(composite_layer.legend_config, legend_config)
        # Mirrored onto the output node, where the evaluator reads it.
        self.assertEqual(
            composite_layer.graph["output"]["inputData"]["legend"],
            {"legendType": "ordinal", "legendConfig": legend_config},
        )
        self.assertEqual(composite_layer.metric_type.legend_type, MetricType.LegendType.ORDINAL)
        self.assertEqual(composite_layer.metric_type.legend_config, legend_config)

    def test_create_with_invalid_legend_config_returns_400(self):
        self.client.force_authenticate(user=self.user)
        payload = {
            "name": "Bad legend",
            "legend_type": "ordinal",
            "legend_config": {"domain": [1, 2], "range": ["#aaaaaa"]},
        }
        response = self.client.post(self.BASE_URL, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("legend_config", response.data)

    def test_create_with_incomplete_graph_is_saved_without_values(self):
        self.client.force_authenticate(user=self.user)
        graph = {
            "layer1": _data_layer_node("layer1", self.metric_a.id, []),
            "out": _output_node("out", []),
        }
        response = self.client.post(self.BASE_URL, {"graph": graph, "name": "Half built"}, format="json")
        result = self.assertJSONResponse(response, status.HTTP_201_CREATED)

        composite_layer = CompositeLayer.objects.get(id=result["id"])
        self.assertEqual(sorted(composite_layer.graph), ["layer1", "out"])
        self.assertEqual(MetricValue.objects.filter(metric_type=composite_layer.metric_type).count(), 0)

    def test_create_with_broken_graph_returns_400(self):
        """A graph that is wired up but cannot be evaluated is a real error, and rolls back."""
        self.client.force_authenticate(user=self.user)
        before_layers = CompositeLayer.objects.count()
        before_types = MetricType.objects.count()

        graph = self._multiply_graph()
        graph["formula1"]["inputData"]["formula"]["formula"] = "a *"
        response = self.client.post(self.BASE_URL, {"graph": graph, "name": "Broken"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("graph", response.data)

        self.assertEqual(CompositeLayer.objects.count(), before_layers)
        self.assertEqual(MetricType.objects.count(), before_types)

    def test_create_missing_name_returns_400(self):
        self.client.force_authenticate(user=self.user)
        before_layers = CompositeLayer.objects.count()
        before_types = MetricType.objects.count()

        response = self.client.post(self.BASE_URL, {"graph": self._multiply_graph()}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", response.data)

        self.assertEqual(CompositeLayer.objects.count(), before_layers)
        self.assertEqual(MetricType.objects.count(), before_types)

    def test_list_composite_layers_only_own_account(self):
        composite_layer = self._create_composite_layer()

        response = self.client.get(self.BASE_URL)
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertEqual([item["id"] for item in result], [composite_layer.id])

    def test_retrieve_composite_layer(self):
        composite_layer = self._create_composite_layer()

        response = self.client.get(f"{self.BASE_URL}{composite_layer.id}/")
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertEqual(result["id"], composite_layer.id)
        self.assertEqual(result["graph"], composite_layer.graph)
        self.assertEqual(result["metric_type_detail"]["id"], composite_layer.metric_type_id)

    def test_retrieve_composite_layer_from_another_account(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f"{self.BASE_URL}{self.other_composite_layer.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_patch_reruns_graph_and_keeps_metric_type(self):
        composite_layer = self._create_composite_layer()
        metric_type_id = composite_layer.metric_type_id

        new_graph = self._multiply_graph(formula="a + b")
        response = self.client.patch(
            f"{self.BASE_URL}{composite_layer.id}/",
            {"graph": new_graph, "name": "Updated score"},
            format="json",
        )
        result = self.assertJSONResponse(response, status.HTTP_200_OK)

        composite_layer.refresh_from_db()
        self.assertEqual(composite_layer.name, "Updated score")
        self.assertEqual(composite_layer.metric_type.name, "Updated score")
        self.assertEqual(composite_layer.metric_type_id, metric_type_id)
        self.assertEqual(result["metric_type"], metric_type_id)

        values = {mv.org_unit_id: mv.value for mv in MetricValue.objects.filter(metric_type_id=metric_type_id)}
        self.assertEqual(values, {self.district_1.id: 5.0, self.district_2.id: 9.0})

    def test_patch_comments_only(self):
        composite_layer = self._create_composite_layer()
        metric_type_id = composite_layer.metric_type_id
        original_graph = composite_layer.graph

        comments = {"c1": {"id": "c1", "text": "annotation"}}
        response = self.client.patch(f"{self.BASE_URL}{composite_layer.id}/", {"comments": comments}, format="json")
        self.assertJSONResponse(response, status.HTTP_200_OK)

        composite_layer.refresh_from_db()
        self.assertEqual(composite_layer.comments, comments)
        self.assertEqual(composite_layer.graph, original_graph)
        self.assertEqual(composite_layer.metric_type_id, metric_type_id)

    def test_patch_metadata_only_updates_metric_type(self):
        composite_layer = self._create_composite_layer()
        metric_type_id = composite_layer.metric_type_id
        value_ids = set(MetricValue.objects.filter(metric_type_id=metric_type_id).values_list("id", flat=True))

        payload = {
            "name": "Renamed",
            "category": "Epidemiology",
            "description": "Updated",
            "units": "per 1000",
            "unit_symbol": "/k",
            "is_population": True,
        }
        response = self.client.patch(f"{self.BASE_URL}{composite_layer.id}/", payload, format="json")
        self.assertJSONResponse(response, status.HTTP_200_OK)

        composite_layer.refresh_from_db()
        self.assertEqual(composite_layer.name, "Renamed")
        self.assertEqual(composite_layer.metric_type_id, metric_type_id)
        metric_type = composite_layer.metric_type
        self.assertEqual(metric_type.name, "Renamed")
        self.assertEqual(metric_type.category, "Epidemiology")
        self.assertEqual(metric_type.description, "Updated")
        self.assertEqual(metric_type.units, "per 1000")
        self.assertEqual(metric_type.unit_symbol, "/k")
        self.assertEqual(metric_type.metric_kind, MetricType.MetricKind.POPULATION)
        # The graph did not change, so its values were not re-evaluated.
        self.assertEqual(
            set(MetricValue.objects.filter(metric_type_id=metric_type_id).values_list("id", flat=True)),
            value_ids,
        )

    def test_patch_legend_only_merges_into_graph_and_reruns(self):
        composite_layer = self._create_composite_layer()

        response = self.client.patch(f"{self.BASE_URL}{composite_layer.id}/", {"legend_type": "linear"}, format="json")
        self.assertJSONResponse(response, status.HTTP_200_OK)

        composite_layer.refresh_from_db()
        self.assertEqual(composite_layer.legend_type, MetricType.LegendType.LINEAR)
        self.assertEqual(composite_layer.graph["out"]["inputData"]["legend"], {"legendType": "linear"})
        self.assertEqual(composite_layer.metric_type.legend_type, MetricType.LegendType.LINEAR)
        self.assertEqual(MetricValue.objects.filter(metric_type=composite_layer.metric_type).count(), 2)

    def test_patch_legend_auto_clears_manual_config(self):
        composite_layer = self._create_composite_layer()
        legend_config = {"domain": [10, 20], "range": ["#aaaaaa", "#bbbbbb"]}
        self.client.patch(
            f"{self.BASE_URL}{composite_layer.id}/",
            {"legend_type": "threshold", "legend_config": legend_config},
            format="json",
        )
        composite_layer.refresh_from_db()
        self.assertEqual(composite_layer.graph["out"]["inputData"]["legend"]["legendConfig"], legend_config)

        self.client.patch(f"{self.BASE_URL}{composite_layer.id}/", {"legend_type": "auto"}, format="json")

        composite_layer.refresh_from_db()
        self.assertEqual(composite_layer.legend_type, CompositeLayer.LegendType.AUTO)
        self.assertEqual(composite_layer.graph["out"]["inputData"]["legend"], {"legendType": "auto"})

    def test_patch_legend_preserves_other_output_input_data(self):
        self.client.force_authenticate(user=self.user)
        graph = self._multiply_graph()
        graph["out"] = _output_node(
            "out",
            [{"nodeId": "formula1", "portName": "result"}],
            input_data={"preview": {"expanded": True}},
        )
        response = self.client.post(self.BASE_URL, {"graph": graph, "name": "With preview"}, format="json")
        result = self.assertJSONResponse(response, status.HTTP_201_CREATED)

        self.client.patch(f"{self.BASE_URL}{result['id']}/", {"legend_type": "ordinal"}, format="json")

        composite_layer = CompositeLayer.objects.get(id=result["id"])
        self.assertEqual(composite_layer.graph["out"]["inputData"]["preview"], {"expanded": True})
        self.assertEqual(composite_layer.graph["out"]["inputData"]["legend"]["legendType"], "ordinal")

    def test_patch_incomplete_graph_keeps_existing_values(self):
        composite_layer = self._create_composite_layer()
        metric_type_id = composite_layer.metric_type_id
        value_ids = set(MetricValue.objects.filter(metric_type_id=metric_type_id).values_list("id", flat=True))

        # The output gets disconnected while the graph is being reworked.
        graph = self._multiply_graph()
        graph["out"] = _output_node("out", [])
        response = self.client.patch(f"{self.BASE_URL}{composite_layer.id}/", {"graph": graph}, format="json")
        self.assertJSONResponse(response, status.HTTP_200_OK)

        composite_layer.refresh_from_db()
        self.assertEqual(composite_layer.graph["out"]["connections"]["inputs"]["layer"], [])
        self.assertEqual(composite_layer.metric_type_id, metric_type_id)
        self.assertEqual(
            set(MetricValue.objects.filter(metric_type_id=metric_type_id).values_list("id", flat=True)),
            value_ids,
        )

    def test_patch_empty_graph_is_allowed(self):
        composite_layer = self._create_composite_layer()
        metric_type_id = composite_layer.metric_type_id

        response = self.client.patch(f"{self.BASE_URL}{composite_layer.id}/", {"graph": {}}, format="json")
        self.assertJSONResponse(response, status.HTTP_200_OK)

        composite_layer.refresh_from_db()
        self.assertEqual(composite_layer.graph, {})
        self.assertEqual(composite_layer.metric_type_id, metric_type_id)
        self.assertEqual(MetricValue.objects.filter(metric_type_id=metric_type_id).count(), 2)

    def test_patch_recreates_metric_type_when_missing(self):
        composite_layer = self._create_composite_layer()
        composite_layer.metric_type.delete()
        composite_layer.refresh_from_db()
        self.assertIsNone(composite_layer.metric_type_id)

        response = self.client.patch(f"{self.BASE_URL}{composite_layer.id}/", {"name": "Restored"}, format="json")
        self.assertJSONResponse(response, status.HTTP_200_OK)

        composite_layer.refresh_from_db()
        self.assertIsNotNone(composite_layer.metric_type_id)
        self.assertEqual(composite_layer.metric_type.name, "Restored")

    def test_list_exposes_legend_fields(self):
        composite_layer = self._create_composite_layer()

        response = self.client.get(self.BASE_URL)
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        item = next(item for item in result if item["id"] == composite_layer.id)
        self.assertEqual(item["legend_type"], CompositeLayer.LegendType.AUTO)
        self.assertEqual(item["legend_config"], {})

    def test_patch_ignores_a_reference_layer_that_no_longer_exists(self):
        composite_layer = self._create_composite_layer()
        stale_id = self.metric_b.id
        self.metric_b.delete()

        graph = self._multiply_graph()
        del graph["layer2"]
        graph["formula1"]["inputData"]["formula"]["formula"] = "a"
        graph["formula1"]["connections"]["inputs"].pop("b")
        graph["out"] = _output_node(
            "out",
            [{"nodeId": "formula1", "portName": "result"}],
            input_data={
                "legend": {"legendType": "reference"},
                "referenceLayer": {"referenceMetricTypeId": stale_id},
            },
        )
        response = self.client.patch(f"{self.BASE_URL}{composite_layer.id}/", {"graph": graph}, format="json")
        self.assertJSONResponse(response, status.HTTP_200_OK)

        composite_layer.refresh_from_db()
        self.assertEqual(composite_layer.legend_type, CompositeLayer.LegendType.REFERENCE)
        self.assertIsNone(composite_layer.legend_reference_metric_type_id)

    def test_patch_composite_layer_from_another_account(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.patch(
            f"{self.BASE_URL}{self.other_composite_layer.id}/", {"comments": {}}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_composite_layer_also_deletes_metric_type(self):
        composite_layer = self._create_composite_layer()
        metric_type_id = composite_layer.metric_type_id

        response = self.client.delete(f"{self.BASE_URL}{composite_layer.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        self.assertFalse(CompositeLayer.objects.filter(id=composite_layer.id).exists())
        self.assertFalse(MetricType.objects.filter(id=metric_type_id).exists())
        self.assertFalse(MetricValue.objects.filter(metric_type_id=metric_type_id).exists())

    def test_delete_composite_layer_from_another_account(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.delete(f"{self.BASE_URL}{self.other_composite_layer.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_preview_returns_result_without_persisting(self):
        self.client.force_authenticate(user=self.user)
        before_layers = CompositeLayer.objects.count()
        before_types = MetricType.objects.count()

        response = self.client.post(f"{self.BASE_URL}preview/", {"graph": self._multiply_graph()}, format="json")
        result = self.assertJSONResponse(response, status.HTTP_200_OK)

        self.assertIn("legend_type", result)
        self.assertIn("legend_config", result)
        self.assertEqual(result["years"], [])
        values = {row["org_unit"]: row["value"] for row in result["metric_values"]}
        self.assertEqual(values, {self.district_1.id: 6.0, self.district_2.id: 20.0})

        self.assertEqual(CompositeLayer.objects.count(), before_layers)
        self.assertEqual(MetricType.objects.count(), before_types)

    def test_preview_with_invalid_graph_returns_400(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(f"{self.BASE_URL}preview/", {"graph": {}}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        response = self.client.post(f"{self.BASE_URL}preview/", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Unlike a save, the preview reports an unfinished graph rather than accepting it.
        graph = self._multiply_graph()
        graph["out"] = _output_node("out", [])
        response = self.client.post(f"{self.BASE_URL}preview/", {"graph": graph}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("graph", response.data)

    def test_unauthenticated_returns_401(self):
        response = self.client.get(self.BASE_URL)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        response = self.client.post(f"{self.BASE_URL}preview/", {"graph": self._multiply_graph()}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_without_settings_perm_returns_403(self):
        self.client.force_authenticate(user=self.user_no_perms)

        response = self.client.get(self.BASE_URL)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        response = self.client.post(self.BASE_URL, {"graph": self._multiply_graph()}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_settings_read_perm_allows_read_but_not_write(self):
        composite_layer = self._create_composite_layer()
        self.client.force_authenticate(user=self.user_read)

        response = self.client.get(self.BASE_URL)
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertEqual([item["id"] for item in result], [composite_layer.id])

        response = self.client.post(self.BASE_URL, {"graph": self._multiply_graph()}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        response = self.client.post(f"{self.BASE_URL}preview/", {"graph": self._multiply_graph()}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        response = self.client.patch(f"{self.BASE_URL}{composite_layer.id}/", {"comments": {}}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        response = self.client.delete(f"{self.BASE_URL}{composite_layer.id}/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
