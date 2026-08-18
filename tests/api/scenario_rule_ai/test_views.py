from unittest.mock import MagicMock, patch

import anthropic

from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status

from iaso.models import Account, MetricType
from plugins.snt_malaria.api.ai_chat.serializers import MAX_ATTACHMENT_SIZE_BYTES
from plugins.snt_malaria.models import ScenarioRule
from plugins.snt_malaria.permissions import SNT_SCENARIO_FULL_WRITE_PERMISSION
from plugins.snt_malaria.tests.common_base import SNTMalariaAPITestCase


BASE_URL = "/api/snt_malaria/scenario_rule_ai/"
ATTACHMENTS_URL = "/api/snt_malaria/scenario_rule_ai/attachments/"


class ScenarioRuleAIAPITestCase(SNTMalariaAPITestCase):
    auto_create_account = False

    def setUp(self):
        super().setUp()

        self.account = Account.objects.create(name="Test Account", anthropic_api_key="sk-test-key")
        self.account_no_key = Account.objects.create(name="Account Without Key")

        self.user = self.create_user_with_profile(
            username="user_with_key", account=self.account, permissions=[SNT_SCENARIO_FULL_WRITE_PERMISSION]
        )
        self.user_no_key = self.create_user_with_profile(
            username="user_no_key",
            account=self.account_no_key,
            permissions=[SNT_SCENARIO_FULL_WRITE_PERMISSION],
        )
        self.user_no_perm = self.create_user_with_profile(username="user_no_perm", account=self.account, permissions=[])

        self.scenario = self.create_snt_scenario(account=self.account, created_by=self.user, name="Test Scenario")
        self.scenario_no_key = self.create_snt_scenario(
            account=self.account_no_key, created_by=self.user_no_key, name="No Key Scenario"
        )

        self.metric_type = MetricType.objects.create(account=self.account, name="Incidence", code="incidence")
        self.ordinal_metric_type = MetricType.objects.create(
            account=self.account,
            name="Incidence category",
            code="incidence_category",
            legend_type=MetricType.LegendType.ORDINAL,
            legend_config={"domain": ["Low", "Medium", "High"], "range": ["#fff", "#aaa", "#000"]},
        )
        self.utility_metric_type = MetricType.objects.create(
            account=self.account, name="Total Population", code="total_pop", is_utility=True
        )
        self.population_kind_metric_type = MetricType.objects.create(
            account=self.account,
            name="TEST",
            code="test_composite",
            metric_kind=MetricType.MetricKind.POPULATION,
        )

        self.int_category = self.create_snt_intervention_category(
            account=self.account, created_by=self.user, name="Vector control"
        )
        self.intervention = self.create_snt_intervention(
            intervention_category=self.int_category,
            created_by=self.user,
            name="Bednets",
            code="bednets",
        )

    def _rule_spec(
        self, id=None, name="High incidence", is_match_all=False, criteria=None, interventions=None, color=None
    ):
        return {
            "id": id,
            "name": name,
            "is_match_all": is_match_all,
            "matching_criteria": (
                criteria
                if criteria is not None
                else [{"metric_type": self.metric_type.id, "operator": ">", "value": 400}]
            ),
            "interventions": interventions if interventions is not None else [self.intervention.id],
            "color": color,
        }

    def _mock_result(self, rules=None, message="Done.", quick_replies=None):
        return {
            "assistant_message": message,
            "rules": rules,
            "quick_replies": quick_replies,
            "conversation_history": [
                {"role": "user", "content": "add a rule"},
                {"role": "assistant", "content": message},
            ],
        }

    def test_unauthenticated_returns_401(self):
        response = self.client.post(BASE_URL, {"scenario": self.scenario.id, "message": "hi"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_user_no_perm_returns_403(self):
        self.client.force_authenticate(self.user_no_perm)
        response = self.client.post(BASE_URL, {"scenario": self.scenario.id, "message": "add a rule"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_missing_message_returns_400(self):
        self.client.force_authenticate(self.user)
        response = self.client.post(BASE_URL, {"scenario": self.scenario.id}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_missing_api_key_returns_400(self):
        self.client.force_authenticate(self.user_no_key)
        response = self.client.post(
            BASE_URL, {"scenario": self.scenario_no_key.id, "message": "add a rule"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Scenario Rule AI API key is not configured", response.data["error"])

    def test_locked_scenario_returns_400(self):
        self.scenario.is_locked = True
        self.scenario.save()
        self.client.force_authenticate(self.user)

        response = self.client.post(BASE_URL, {"scenario": self.scenario.id, "message": "add a rule"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("plugins.snt_malaria.api.scenario_rule_ai.views.generate_scenario_rules")
    def test_claude_503_returns_503(self, mock_gen):
        mock_response = MagicMock()
        mock_response.status_code = 503
        mock_gen.side_effect = anthropic.APIStatusError("service unavailable", response=mock_response, body=None)
        self.client.force_authenticate(self.user)

        response = self.client.post(BASE_URL, {"scenario": self.scenario.id, "message": "add a rule"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)

    @patch("plugins.snt_malaria.api.scenario_rule_ai.views.generate_scenario_rules")
    def test_claude_400_never_leaks_anthropics_message_to_the_user(self, mock_gen):
        # E.g. an out-of-credit or invalid API key - an admin-level config problem the end user has
        # no visibility or control over (they don't use their own Anthropic subscription), so the
        # response must stay generic regardless of what Anthropic's error body says.
        mock_response = MagicMock()
        mock_response.status_code = 400
        mock_gen.side_effect = anthropic.APIStatusError(
            "bad request",
            response=mock_response,
            body={
                "type": "error",
                "error": {"type": "invalid_request_error", "message": "Your credit balance is too low."},
            },
        )
        self.client.force_authenticate(self.user)

        response = self.client.post(BASE_URL, {"scenario": self.scenario.id, "message": "add a rule"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("contact your administrator", response.data["error"])
        self.assertNotIn("credit balance", response.data["error"])

    @patch("plugins.snt_malaria.api.scenario_rule_ai.views.generate_scenario_rules")
    def test_conversational_response_has_no_rules_and_does_not_persist(self, mock_gen):
        mock_gen.return_value = self._mock_result(rules=None, message="Which intervention did you mean?")
        self.client.force_authenticate(self.user)

        response = self.client.post(BASE_URL, {"scenario": self.scenario.id, "message": "add a rule"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data["rules"])
        self.assertEqual(ScenarioRule.objects.filter(scenario=self.scenario).count(), 0)

    @patch("plugins.snt_malaria.api.scenario_rule_ai.views.generate_scenario_rules")
    def test_conversation_history_is_forwarded(self, mock_gen):
        mock_gen.return_value = self._mock_result(rules=None)
        self.client.force_authenticate(self.user)

        history = [{"role": "user", "content": "prev"}, {"role": "assistant", "content": "ok"}]
        self.client.post(
            BASE_URL,
            {"scenario": self.scenario.id, "message": "next", "conversation_history": history},
            format="json",
        )

        call_args = mock_gen.call_args
        self.assertEqual(call_args[0][1], history)

    @patch("plugins.snt_malaria.api.scenario_rule_ai.views.generate_scenario_rules")
    def test_successful_generation_creates_rule(self, mock_gen):
        mock_gen.return_value = self._mock_result(rules=[self._rule_spec()])
        self.client.force_authenticate(self.user)

        response = self.client.post(BASE_URL, {"scenario": self.scenario.id, "message": "add a rule"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["rules"]), 1)

        rule = ScenarioRule.objects.get(scenario=self.scenario)
        self.assertEqual(rule.name, "High incidence")
        self.assertEqual(rule.priority, 1)
        self.assertEqual(list(rule.interventions.values_list("id", flat=True)), [self.intervention.id])
        self.assertEqual(rule.matching_criteria, {"and": [{">": [{"var": self.metric_type.id}, 400]}]})

    @patch("plugins.snt_malaria.api.scenario_rule_ai.views.generate_scenario_rules")
    def test_successful_generation_assigns_distinct_colors(self, mock_gen):
        mock_gen.return_value = self._mock_result(
            rules=[
                self._rule_spec(
                    name="Rule A", criteria=[{"metric_type": self.metric_type.id, "operator": ">", "value": 100}]
                ),
                self._rule_spec(
                    name="Rule B", criteria=[{"metric_type": self.metric_type.id, "operator": ">", "value": 200}]
                ),
                self._rule_spec(
                    name="Rule C", criteria=[{"metric_type": self.metric_type.id, "operator": ">", "value": 300}]
                ),
            ]
        )
        self.client.force_authenticate(self.user)

        response = self.client.post(BASE_URL, {"scenario": self.scenario.id, "message": "add rules"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        colors = list(ScenarioRule.objects.filter(scenario=self.scenario).values_list("color", flat=True))
        self.assertEqual(len(colors), 3)
        self.assertEqual(len(set(colors)), 3)

    @patch("plugins.snt_malaria.api.scenario_rule_ai.views.generate_scenario_rules")
    def test_ai_specified_color_is_used_for_new_rule(self, mock_gen):
        mock_gen.return_value = self._mock_result(rules=[self._rule_spec(color="#b71c1c")])
        self.client.force_authenticate(self.user)

        response = self.client.post(BASE_URL, {"scenario": self.scenario.id, "message": "add a rule"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        rule = ScenarioRule.objects.get(scenario=self.scenario)
        self.assertEqual(rule.color, "#B71C1C")

    @patch("plugins.snt_malaria.api.scenario_rule_ai.views.generate_scenario_rules")
    def test_ai_specified_color_case_insensitive_normalized(self, mock_gen):
        mock_gen.return_value = self._mock_result(rules=[self._rule_spec(color="#B71C1C")])
        self.client.force_authenticate(self.user)

        response = self.client.post(BASE_URL, {"scenario": self.scenario.id, "message": "add a rule"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        rule = ScenarioRule.objects.get(scenario=self.scenario)
        self.assertEqual(rule.color, "#B71C1C")

    @patch("plugins.snt_malaria.api.scenario_rule_ai.views.generate_scenario_rules")
    def test_invalid_color_falls_back_to_auto_pick_not_rejected(self, mock_gen):
        mock_gen.return_value = self._mock_result(rules=[self._rule_spec(color="not-a-real-color")])
        self.client.force_authenticate(self.user)

        response = self.client.post(BASE_URL, {"scenario": self.scenario.id, "message": "add a rule"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        rule = ScenarioRule.objects.get(scenario=self.scenario)
        self.assertNotEqual(rule.color, "not-a-real-color")
        self.assertTrue(rule.color)

    @patch("plugins.snt_malaria.api.scenario_rule_ai.views.generate_scenario_rules")
    def test_ai_specified_color_updates_existing_rule(self, mock_gen):
        existing_rule = ScenarioRule.objects.create(
            name="Old rule",
            priority=1,
            color="#000000",
            scenario=self.scenario,
            created_by=self.user,
            matching_criteria={"and": [{">": [{"var": self.metric_type.id}, 100]}]},
            org_units_matched=[],
        )
        existing_rule.interventions.add(self.intervention)

        mock_gen.return_value = self._mock_result(rules=[self._rule_spec(id=existing_rule.id, color="#B71C1C")])
        self.client.force_authenticate(self.user)

        response = self.client.post(
            BASE_URL, {"scenario": self.scenario.id, "message": "change the color"}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        existing_rule.refresh_from_db()
        self.assertEqual(existing_rule.color, "#B71C1C")

    @patch("plugins.snt_malaria.api.scenario_rule_ai.views.generate_scenario_rules")
    def test_omitted_color_keeps_existing_color_on_update(self, mock_gen):
        existing_rule = ScenarioRule.objects.create(
            name="Old rule",
            priority=1,
            color="#000000",
            scenario=self.scenario,
            created_by=self.user,
            matching_criteria={"and": [{">": [{"var": self.metric_type.id}, 100]}]},
            org_units_matched=[],
        )
        existing_rule.interventions.add(self.intervention)

        mock_gen.return_value = self._mock_result(
            rules=[self._rule_spec(id=existing_rule.id, name="Renamed rule", color=None)]
        )
        self.client.force_authenticate(self.user)

        response = self.client.post(
            BASE_URL, {"scenario": self.scenario.id, "message": "rename the rule"}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        existing_rule.refresh_from_db()
        self.assertEqual(existing_rule.color, "#000000")
        self.assertEqual(existing_rule.name, "Renamed rule")

    @patch("plugins.snt_malaria.api.scenario_rule_ai.views.generate_scenario_rules")
    def test_current_rules_context_includes_color(self, mock_gen):
        existing_rule = ScenarioRule.objects.create(
            name="Existing",
            priority=1,
            color="#B71C1C",
            scenario=self.scenario,
            created_by=self.user,
            matching_criteria={"and": [{">": [{"var": self.metric_type.id}, 400]}]},
            org_units_matched=[],
        )
        existing_rule.interventions.add(self.intervention)

        mock_gen.return_value = self._mock_result(rules=None)
        self.client.force_authenticate(self.user)

        self.client.post(BASE_URL, {"scenario": self.scenario.id, "message": "hi"}, format="json")

        current_rules = mock_gen.call_args.kwargs["current_rules"]
        self.assertEqual(current_rules[0]["color"], "#B71C1C")

    @patch("plugins.snt_malaria.api.scenario_rule_ai.views.generate_scenario_rules")
    def test_categorical_criterion_with_equality_operator_succeeds(self, mock_gen):
        mock_gen.return_value = self._mock_result(
            rules=[
                self._rule_spec(
                    criteria=[{"metric_type": self.ordinal_metric_type.id, "operator": "==", "string_value": "High"}]
                )
            ]
        )
        self.client.force_authenticate(self.user)

        response = self.client.post(BASE_URL, {"scenario": self.scenario.id, "message": "add a rule"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        rule = ScenarioRule.objects.get(scenario=self.scenario)
        self.assertEqual(rule.matching_criteria, {"and": [{"==": [{"var": self.ordinal_metric_type.id}, "High"]}]})

    @patch("plugins.snt_malaria.api.scenario_rule_ai.views.generate_scenario_rules")
    def test_categorical_criterion_with_non_equality_operator_rejected(self, mock_gen):
        mock_gen.return_value = self._mock_result(
            rules=[
                self._rule_spec(
                    criteria=[{"metric_type": self.ordinal_metric_type.id, "operator": ">", "string_value": "High"}]
                )
            ]
        )
        self.client.force_authenticate(self.user)

        response = self.client.post(BASE_URL, {"scenario": self.scenario.id, "message": "add a rule"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(ScenarioRule.objects.filter(scenario=self.scenario).count(), 0)

    @patch("plugins.snt_malaria.api.scenario_rule_ai.views.generate_scenario_rules")
    def test_metric_types_sent_include_legend_info(self, mock_gen):
        mock_gen.return_value = self._mock_result(rules=None)
        self.client.force_authenticate(self.user)

        self.client.post(BASE_URL, {"scenario": self.scenario.id, "message": "hi"}, format="json")

        metric_types_sent = mock_gen.call_args[0][2]
        ordinal_sent = next(m for m in metric_types_sent if m["id"] == self.ordinal_metric_type.id)
        self.assertEqual(ordinal_sent["legend_type"], "ordinal")
        self.assertEqual(ordinal_sent["legend_config"]["domain"], ["Low", "Medium", "High"])

    @patch("plugins.snt_malaria.api.scenario_rule_ai.views.generate_scenario_rules")
    def test_utility_metric_types_excluded_from_catalog(self, mock_gen):
        # is_utility layers (e.g. population layers driving budget calculations) aren't shown as
        # selectable criteria anywhere else in the UI, so the AI shouldn't be offered them either.
        mock_gen.return_value = self._mock_result(rules=None)
        self.client.force_authenticate(self.user)

        self.client.post(BASE_URL, {"scenario": self.scenario.id, "message": "hi"}, format="json")

        metric_types_sent = mock_gen.call_args[0][2]
        sent_ids = {m["id"] for m in metric_types_sent}
        self.assertNotIn(self.utility_metric_type.id, sent_ids)

    @patch("plugins.snt_malaria.api.scenario_rule_ai.views.generate_scenario_rules")
    def test_rule_referencing_utility_metric_type_rejected(self, mock_gen):
        # Even though it's a real MetricType for this account, it's excluded from the catalog on
        # purpose (see test above) - referencing it anyway must be rejected, not silently persisted
        # as a rule the UI can't display a name for.
        mock_gen.return_value = self._mock_result(
            rules=[
                self._rule_spec(criteria=[{"metric_type": self.utility_metric_type.id, "operator": ">", "value": 1000}])
            ]
        )
        self.client.force_authenticate(self.user)

        response = self.client.post(BASE_URL, {"scenario": self.scenario.id, "message": "add a rule"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(ScenarioRule.objects.filter(scenario=self.scenario).count(), 0)

    @patch("plugins.snt_malaria.api.scenario_rule_ai.views.generate_scenario_rules")
    def test_population_kind_metric_types_excluded_from_catalog(self, mock_gen):
        # metric_kind=POPULATION composites (e.g. a "is population" composite layer) are excluded
        # from the planning page's own criteria catalog (useGetMetricCategories('any') filters to
        # metric_kind=ANY server-side, despite the name), so they show no name in the UI either - the
        # AI must not be offered them.
        mock_gen.return_value = self._mock_result(rules=None)
        self.client.force_authenticate(self.user)

        self.client.post(BASE_URL, {"scenario": self.scenario.id, "message": "hi"}, format="json")

        metric_types_sent = mock_gen.call_args[0][2]
        sent_ids = {m["id"] for m in metric_types_sent}
        self.assertNotIn(self.population_kind_metric_type.id, sent_ids)

    @patch("plugins.snt_malaria.api.scenario_rule_ai.views.generate_scenario_rules")
    def test_rule_referencing_population_kind_metric_type_rejected(self, mock_gen):
        mock_gen.return_value = self._mock_result(
            rules=[
                self._rule_spec(
                    criteria=[{"metric_type": self.population_kind_metric_type.id, "operator": ">", "value": 1000}]
                )
            ]
        )
        self.client.force_authenticate(self.user)

        response = self.client.post(BASE_URL, {"scenario": self.scenario.id, "message": "add a rule"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(ScenarioRule.objects.filter(scenario=self.scenario).count(), 0)

    @patch("plugins.snt_malaria.api.scenario_rule_ai.views.generate_scenario_rules")
    def test_rule_referencing_unknown_metric_type_rejected(self, mock_gen):
        mock_gen.return_value = self._mock_result(
            rules=[self._rule_spec(criteria=[{"metric_type": 999999, "operator": ">", "value": 1000}])]
        )
        self.client.force_authenticate(self.user)

        response = self.client.post(BASE_URL, {"scenario": self.scenario.id, "message": "add a rule"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(ScenarioRule.objects.filter(scenario=self.scenario).count(), 0)

    @patch("plugins.snt_malaria.api.scenario_rule_ai.views.generate_scenario_rules")
    def test_rule_with_no_interventions_rejected(self, mock_gen):
        # A rule with no interventions matches org units but assigns nothing - a no-op that must
        # never be persisted, even a match-all "baseline" one.
        mock_gen.return_value = self._mock_result(rules=[self._rule_spec(is_match_all=True, interventions=[])])
        self.client.force_authenticate(self.user)

        response = self.client.post(BASE_URL, {"scenario": self.scenario.id, "message": "add a rule"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(ScenarioRule.objects.filter(scenario=self.scenario).count(), 0)

    @patch("plugins.snt_malaria.api.scenario_rule_ai.views.generate_scenario_rules")
    def test_successful_generation_updates_existing_rule_in_place(self, mock_gen):
        existing_rule = ScenarioRule.objects.create(
            name="Old name",
            priority=1,
            scenario=self.scenario,
            created_by=self.user,
            matching_criteria={"and": [{">": [{"var": self.metric_type.id}, 100]}]},
            org_units_matched=[],
        )
        existing_rule.interventions.add(self.intervention)

        mock_gen.return_value = self._mock_result(rules=[self._rule_spec(id=existing_rule.id, name="New name")])
        self.client.force_authenticate(self.user)

        response = self.client.post(
            BASE_URL, {"scenario": self.scenario.id, "message": "rename the rule"}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(ScenarioRule.objects.filter(scenario=self.scenario).count(), 1)
        existing_rule.refresh_from_db()
        self.assertEqual(existing_rule.name, "New name")

    @patch("plugins.snt_malaria.api.scenario_rule_ai.views.generate_scenario_rules")
    def test_successful_generation_deletes_omitted_rule(self, mock_gen):
        rule_to_keep = ScenarioRule.objects.create(
            name="Keep me",
            priority=1,
            scenario=self.scenario,
            created_by=self.user,
            matching_criteria={"all": True},
            org_units_matched=[],
        )
        rule_to_keep.interventions.add(self.intervention)
        rule_to_delete = ScenarioRule.objects.create(
            name="Delete me",
            priority=2,
            scenario=self.scenario,
            created_by=self.user,
            matching_criteria={"all": True},
            org_units_matched=[],
        )
        rule_to_delete.interventions.add(self.intervention)

        mock_gen.return_value = self._mock_result(
            rules=[self._rule_spec(id=rule_to_keep.id, name="Keep me", is_match_all=True, criteria=[])]
        )
        self.client.force_authenticate(self.user)

        response = self.client.post(
            BASE_URL, {"scenario": self.scenario.id, "message": "remove the other rule"}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        remaining = ScenarioRule.objects.filter(scenario=self.scenario)
        self.assertEqual(remaining.count(), 1)
        self.assertEqual(remaining.first().id, rule_to_keep.id)

    @patch("plugins.snt_malaria.api.scenario_rule_ai.views.generate_scenario_rules")
    def test_invalid_rule_spec_rolls_back_and_returns_400(self, mock_gen):
        existing_rule = ScenarioRule.objects.create(
            name="Existing",
            priority=1,
            scenario=self.scenario,
            created_by=self.user,
            matching_criteria={"all": True},
            org_units_matched=[],
        )
        existing_rule.interventions.add(self.intervention)

        # is_match_all=False with no criteria is invalid - _rule_spec_to_payload should reject it,
        # and the whole batch (including the deletion of `existing_rule`) must roll back.
        mock_gen.return_value = self._mock_result(rules=[self._rule_spec(is_match_all=False, criteria=[])])
        self.client.force_authenticate(self.user)

        response = self.client.post(
            BASE_URL, {"scenario": self.scenario.id, "message": "add a broken rule"}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(ScenarioRule.objects.filter(scenario=self.scenario).count(), 1)
        self.assertTrue(ScenarioRule.objects.filter(id=existing_rule.id).exists())

    @patch("plugins.snt_malaria.api.scenario_rule_ai.views.generate_scenario_rules")
    def test_current_rules_context_excludes_resolved_org_units(self, mock_gen):
        existing_rule = ScenarioRule.objects.create(
            name="Existing",
            priority=1,
            scenario=self.scenario,
            created_by=self.user,
            matching_criteria={"and": [{">": [{"var": self.metric_type.id}, 400]}]},
            org_units_matched=[1, 2, 3],
            org_units_excluded=[2],
            org_units_included=[4],
        )
        existing_rule.interventions.add(self.intervention)

        mock_gen.return_value = self._mock_result(rules=None)
        self.client.force_authenticate(self.user)

        self.client.post(BASE_URL, {"scenario": self.scenario.id, "message": "hi"}, format="json")

        current_rules = mock_gen.call_args.kwargs["current_rules"]
        self.assertEqual(len(current_rules), 1)
        sent_rule = current_rules[0]
        self.assertEqual(
            set(sent_rule.keys()), {"id", "name", "is_match_all", "matching_criteria", "interventions", "color"}
        )
        self.assertEqual(
            sent_rule["matching_criteria"], [{"metric_type": self.metric_type.id, "operator": ">", "value": 400}]
        )

    @patch("plugins.snt_malaria.api.scenario_rule_ai.views.generate_scenario_rules")
    def test_only_account_scoped_interventions_and_metric_types_are_sent(self, mock_gen):
        other_account = Account.objects.create(name="Other Account", anthropic_api_key="sk-other")
        other_user = self.create_user_with_profile(
            username="other_user", account=other_account, permissions=[SNT_SCENARIO_FULL_WRITE_PERMISSION]
        )
        MetricType.objects.create(account=other_account, name="Other layer", code="other_layer")
        other_category = self.create_snt_intervention_category(
            account=other_account, created_by=other_user, name="Other category"
        )
        self.create_snt_intervention(
            intervention_category=other_category, created_by=other_user, name="Other intervention", code="other_int"
        )

        mock_gen.return_value = self._mock_result(rules=None)
        self.client.force_authenticate(self.user)

        self.client.post(BASE_URL, {"scenario": self.scenario.id, "message": "hi"}, format="json")

        call_args = mock_gen.call_args
        metric_types_sent = call_args[0][2]
        interventions_sent = call_args[0][3]
        self.assertEqual(sorted(m["name"] for m in metric_types_sent), sorted(["Incidence", "Incidence category"]))
        self.assertEqual([i["name"] for i in interventions_sent], ["Bednets"])


class ScenarioRuleAIAttachmentAPITestCase(ScenarioRuleAIAPITestCase):
    def _pdf_file(self, name="strategy.pdf", content=b"%PDF-1.4 test", content_type="application/pdf"):
        return SimpleUploadedFile(name, content, content_type=content_type)

    def test_unauthenticated_returns_401(self):
        response = self.client.post(ATTACHMENTS_URL, {"file": self._pdf_file()}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_user_no_perm_returns_403(self):
        self.client.force_authenticate(self.user_no_perm)
        response = self.client.post(ATTACHMENTS_URL, {"file": self._pdf_file()}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_missing_file_returns_400(self):
        self.client.force_authenticate(self.user)
        response = self.client.post(ATTACHMENTS_URL, {}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_non_pdf_content_is_rejected_regardless_of_declared_content_type(self):
        self.client.force_authenticate(self.user)
        response = self.client.post(
            ATTACHMENTS_URL,
            {"file": self._pdf_file(name="strategy.docx", content=b"This is not actually a PDF.")},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Only PDF files", str(response.data["file"]))

    def test_oversized_file_returns_400(self):
        self.client.force_authenticate(self.user)
        oversized = self._pdf_file(content=b"%PDF-1.4 " + b"0" * MAX_ATTACHMENT_SIZE_BYTES)

        response = self.client.post(ATTACHMENTS_URL, {"file": oversized}, format="multipart")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("too large", str(response.data["file"]))

    def test_missing_api_key_returns_400(self):
        self.client.force_authenticate(self.user_no_key)
        response = self.client.post(ATTACHMENTS_URL, {"file": self._pdf_file()}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("plugins.snt_malaria.services.ai_chat.anthropic_files.anthropic.Anthropic")
    def test_successful_upload_returns_file_id(self, mock_anthropic_cls):
        mock_client = MagicMock()
        mock_client.beta.files.upload.return_value = MagicMock(id="file_abc123", size_bytes=13)
        mock_anthropic_cls.return_value = mock_client
        self.client.force_authenticate(self.user)

        response = self.client.post(ATTACHMENTS_URL, {"file": self._pdf_file()}, format="multipart")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["file_id"], "file_abc123")
        self.assertEqual(response.data["filename"], "strategy.pdf")
        self.assertEqual(mock_client.beta.files.upload.call_args.kwargs["betas"], ["files-api-2025-04-14"])

    @patch("plugins.snt_malaria.services.ai_chat.anthropic_files.anthropic.Anthropic")
    def test_upload_error_returns_400(self, mock_anthropic_cls):
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.status_code = 400
        mock_client.beta.files.upload.side_effect = anthropic.APIStatusError(
            "bad request", response=mock_response, body=None
        )
        mock_anthropic_cls.return_value = mock_client
        self.client.force_authenticate(self.user)

        response = self.client.post(ATTACHMENTS_URL, {"file": self._pdf_file()}, format="multipart")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("plugins.snt_malaria.services.ai_chat.anthropic_files.anthropic.Anthropic")
    def test_delete_calls_anthropic_files_delete(self, mock_anthropic_cls):
        mock_client = MagicMock()
        mock_anthropic_cls.return_value = mock_client
        self.client.force_authenticate(self.user)

        response = self.client.delete(f"{ATTACHMENTS_URL}file_abc123/")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        mock_client.beta.files.delete.assert_called_once_with("file_abc123", betas=["files-api-2025-04-14"])

    def test_delete_without_api_key_returns_204_without_calling_anthropic(self):
        self.client.force_authenticate(self.user_no_key)

        response = self.client.delete(f"{ATTACHMENTS_URL}file_abc123/")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
