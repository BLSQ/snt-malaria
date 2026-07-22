from unittest.mock import MagicMock, patch

import anthropic

from iaso.models import Account, MetricType
from plugins.snt_malaria.permissions import SNT_SETTINGS_WRITE_PERMISSION
from plugins.snt_malaria.tests.common_base import SNTMalariaAPITestCase


BASE_URL = "/api/snt_malaria/composite_layer_ai/"


class CompositeLayerAIAPITestCase(SNTMalariaAPITestCase):
    auto_create_account = False

    def setUp(self):
        super().setUp()

        self.account = Account.objects.create(
            name="Test Account",
            anthropic_api_key="sk-test-key",
        )
        self.account_no_key = Account.objects.create(name="Account Without Key")

        self.user = self.create_user_with_profile(
            username="user_with_key", account=self.account, permissions=[SNT_SETTINGS_WRITE_PERMISSION]
        )
        self.user_no_key = self.create_user_with_profile(
            username="user_no_key", account=self.account_no_key, permissions=[SNT_SETTINGS_WRITE_PERMISSION]
        )

        self.metric_type = MetricType.objects.create(
            account=self.account,
            name="Rainfall",
            code="rainfall",
        )

    def _mock_generate_composite_layer_graph(self, with_graph=True):
        return {
            "assistant_message": "Here is your composite layer.",
            "graph": (
                {
                    "nodes": [
                        {
                            "id": "rainfall",
                            "type": "dataLayer",
                            "metric_type_id": str(self.metric_type.id),
                        },
                        {
                            "id": "weighted",
                            "type": "formula",
                            "inputs": ["rainfall"],
                            "formula": "a * 2",
                        },
                    ],
                    "output": {
                        "source": "weighted",
                        "name": "Weighted rainfall",
                        "legend_type": "auto",
                    },
                }
                if with_graph
                else None
            ),
            "conversation_history": [
                {"role": "user", "content": "Create a composite layer"},
                {"role": "assistant", "content": "Here is your composite layer."},
            ],
        }

    def test_unauthenticated_returns_401(self):
        response = self.client.post(BASE_URL, {"message": "hi"}, format="json")
        self.assertEqual(response.status_code, 401)

    def test_missing_api_key_returns_400(self):
        self.client.force_authenticate(self.user_no_key)
        response = self.client.post(BASE_URL, {"message": "Create a composite layer"}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("Composite Layer AI API key is not configured", response.data["error"])

    def test_missing_message_returns_400(self):
        self.client.force_authenticate(self.user)
        response = self.client.post(BASE_URL, {}, format="json")
        self.assertEqual(response.status_code, 400)

    @patch("plugins.snt_malaria.api.composite_layer_ai.views.generate_composite_layer_graph")
    def test_claude_503_returns_503(self, mock_gen):
        mock_response = MagicMock()
        mock_response.status_code = 503
        mock_gen.side_effect = anthropic.APIStatusError("service unavailable", response=mock_response, body=None)
        self.client.force_authenticate(self.user)

        response = self.client.post(BASE_URL, {"message": "Create a composite layer"}, format="json")

        self.assertEqual(response.status_code, 503)

    @patch("plugins.snt_malaria.api.composite_layer_ai.views.generate_composite_layer_graph")
    def test_successful_generation(self, mock_gen):
        mock_gen.return_value = self._mock_generate_composite_layer_graph(with_graph=True)
        self.client.force_authenticate(self.user)

        response = self.client.post(BASE_URL, {"message": "Double the rainfall layer"}, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["assistant_message"], "Here is your composite layer.")
        self.assertEqual(response.data["graph"]["output"]["name"], "Weighted rainfall")
        self.assertEqual(len(response.data["graph"]["nodes"]), 2)
        self.assertEqual(len(response.data["conversation_history"]), 2)

    @patch("plugins.snt_malaria.api.composite_layer_ai.views.generate_composite_layer_graph")
    def test_conversational_response_has_no_graph(self, mock_gen):
        mock_gen.return_value = self._mock_generate_composite_layer_graph(with_graph=False)
        self.client.force_authenticate(self.user)

        response = self.client.post(BASE_URL, {"message": "How are you?"}, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data["graph"])

    @patch("plugins.snt_malaria.api.composite_layer_ai.views.generate_composite_layer_graph")
    def test_conversation_history_is_forwarded(self, mock_gen):
        mock_gen.return_value = self._mock_generate_composite_layer_graph(with_graph=False)
        self.client.force_authenticate(self.user)

        history = [{"role": "user", "content": "prev"}, {"role": "assistant", "content": "ok"}]
        self.client.post(
            BASE_URL,
            {"message": "next", "conversation_history": history},
            format="json",
        )

        call_args = mock_gen.call_args
        self.assertEqual(call_args[0][1], history)

    @patch("plugins.snt_malaria.api.composite_layer_ai.views.generate_composite_layer_graph")
    def test_only_non_utility_metric_types_are_sent(self, mock_gen):
        MetricType.objects.create(
            account=self.account,
            name="Population",
            code="population",
            is_utility=True,
        )
        mock_gen.return_value = self._mock_generate_composite_layer_graph(with_graph=False)
        self.client.force_authenticate(self.user)

        self.client.post(BASE_URL, {"message": "hi"}, format="json")

        call_args = mock_gen.call_args
        metric_types_sent = call_args[0][2]
        self.assertEqual(len(metric_types_sent), 1)
        self.assertEqual(metric_types_sent[0]["name"], "Rainfall")
