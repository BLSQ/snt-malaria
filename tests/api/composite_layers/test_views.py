from django.contrib.gis.geos import MultiPolygon, Point, Polygon
from rest_framework import status

from iaso.models import AccountFeatureFlag, MetricType, MetricValue, OrgUnit
from plugins.snt_malaria.api.composite_layers.permissions import SHOW_DEV_FEATURES
from plugins.snt_malaria.models import CompositeLayer
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


def _output_node(node_id, name, layer_source):
    return {
        "id": node_id,
        "type": "output",
        "x": 0,
        "y": 0,
        "inputData": {"name": {"name": name}},
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
        self.user = self.create_user_with_profile(username="user", account=self.account, permissions=[])

        self.dev_features_flag, _ = AccountFeatureFlag.objects.get_or_create(
            code=SHOW_DEV_FEATURES, defaults={"name": "Display dev features in web."}
        )
        self.account.feature_flags.add(self.dev_features_flag)

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

        # Other account (dev flag enabled too) for tenancy tests.
        self.other_account, _, self.other_version, _ = self.create_account_datasource_version_project(
            "other source", "Other Account", "other project"
        )
        self.other_account.feature_flags.add(self.dev_features_flag)
        self.other_user = self.create_user_with_profile(username="other_user", account=self.other_account)
        self.other_composite_layer = CompositeLayer.objects.create(
            account=self.other_account,
            name="Other composite",
            graph={},
            created_by=self.other_user,
        )

        # Account without the dev features flag, to test the feature gate.
        self.no_flag_account, _, _, _ = self.create_account_datasource_version_project(
            "no flag source", "No Flag Account", "no flag project"
        )
        self.no_flag_user = self.create_user_with_profile(username="no_flag_user", account=self.no_flag_account)

    def _multiply_graph(self, name="Risk score", formula="a * b"):
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
            "out": _output_node("out", name, [{"nodeId": "formula1", "portName": "result"}]),
        }

    def _create_composite_layer(self, name="Risk score"):
        """Create a composite layer through the API and return the model instance."""
        self.client.force_authenticate(user=self.user)
        response = self.client.post(self.BASE_URL, {"graph": self._multiply_graph(name=name)}, format="json")
        result = self.assertJSONResponse(response, status.HTTP_201_CREATED)
        return CompositeLayer.objects.get(id=result["id"])

    def test_create_composite_layer(self):
        self.client.force_authenticate(user=self.user)
        payload = {"graph": self._multiply_graph(), "comments": {"c1": {"id": "c1", "text": "note"}}}
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
        self.assertEqual(metric_type.category, "Composite")
        values = {mv.org_unit_id: mv.value for mv in MetricValue.objects.filter(metric_type=metric_type)}
        self.assertEqual(values, {self.district_1.id: 6.0, self.district_2.id: 20.0})

        self.assertEqual(result["name"], "Risk score")
        self.assertEqual(result["metric_type"], metric_type.id)
        self.assertEqual(result["metric_type_detail"]["id"], metric_type.id)
        self.assertEqual(result["created_by"]["id"], self.user.id)

    def test_create_with_invalid_graph_returns_400(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(self.BASE_URL, {"graph": {}}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Structurally valid JSON but no output node.
        graph = {"layer1": _data_layer_node("layer1", self.metric_a.id, [])}
        response = self.client.post(self.BASE_URL, {"graph": graph}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("graph", response.data)

    def test_create_does_not_persist_on_error(self):
        self.client.force_authenticate(user=self.user)
        before_layers = CompositeLayer.objects.count()
        before_types = MetricType.objects.count()

        graph = self._multiply_graph(name="")  # missing output name
        response = self.client.post(self.BASE_URL, {"graph": graph}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

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

        new_graph = self._multiply_graph(name="Updated score", formula="a + b")
        response = self.client.patch(f"{self.BASE_URL}{composite_layer.id}/", {"graph": new_graph}, format="json")
        result = self.assertJSONResponse(response, status.HTTP_200_OK)

        composite_layer.refresh_from_db()
        self.assertEqual(composite_layer.name, "Updated score")
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

        self.assertEqual(result["name"], "Risk score")
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

    def test_unauthenticated_returns_401(self):
        response = self.client.get(self.BASE_URL)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        response = self.client.post(f"{self.BASE_URL}preview/", {"graph": self._multiply_graph()}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_without_dev_features_flag_returns_403(self):
        self.client.force_authenticate(user=self.no_flag_user)

        response = self.client.get(self.BASE_URL)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        response = self.client.post(f"{self.BASE_URL}preview/", {"graph": self._multiply_graph()}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
