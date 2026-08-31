import logging

from django.db.models import F
from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from plugins.snt_malaria.api.ai_chat.mixins import AIChatAttachmentViewSetMixin
from plugins.snt_malaria.models import Intervention, ScenarioRule
from plugins.snt_malaria.services.ai_chat import classify_anthropic_error

from .agent import generate_scenario_rules
from .matching_criteria import is_match_all, jsonlogic_to_matching_criteria
from .permissions import ScenarioRuleAIPermission
from .rule_set import build_account_metric_types, persist_scenario_rule_set
from .serializers import (
    ScenarioRuleAIRequestSerializer,
    ScenarioRuleAIResponseSerializer,
    ScenarioRuleRestoreRequestSerializer,
    ScenarioRuleRestoreResponseSerializer,
)


logger = logging.getLogger(__name__)


def _rule_to_ai_context(rule: ScenarioRule) -> dict:
    """Whitelisted view of a rule sent to the AI: definition only - name, criteria (thresholds, not
    values), interventions, color. Never `org_units_matched`/`org_units_excluded`/`org_units_included`
    (real org unit ids tied to a resolved health-metric condition), and never any MetricValue data."""
    return {
        "id": rule.id,
        "name": rule.name,
        "is_match_all": is_match_all(rule.matching_criteria),
        "matching_criteria": (
            [] if is_match_all(rule.matching_criteria) else jsonlogic_to_matching_criteria(rule.matching_criteria)
        ),
        "interventions": [intervention.id for intervention in rule.interventions.all()],
        "color": rule.color,
    }


@extend_schema(tags=["SNT Malaria"])
class ScenarioRuleAIViewSet(AIChatAttachmentViewSetMixin, viewsets.ViewSet):
    """AI-powered scenario rule generation.

    Send a natural language message describing the desired scenario rules. The AI sees the account's
    data layer and intervention catalogs plus the scenario's current rules (definitions only, never
    resolved org units or data values), and generates the complete desired rule set for the scenario,
    which is persisted immediately - creating, updating, deleting, and reprioritizing rules as needed.

    `restore` re-persists a rule set the chat client captured before an earlier turn, so the user can
    revert an AI change from the transcript.
    """

    permission_classes = [ScenarioRuleAIPermission]
    API_KEY_MISSING_ERROR = (
        "Scenario Rule AI API key is not configured for this account. Please contact your administrator."
    )

    def get_serializer_context(self):
        return {"request": self.request}

    @extend_schema(
        request=ScenarioRuleAIRequestSerializer,
        responses={200: ScenarioRuleAIResponseSerializer},
    )
    def create(self, request):
        serializer = ScenarioRuleAIRequestSerializer(data=request.data, context=self.get_serializer_context())
        serializer.is_valid(raise_exception=True)

        scenario = serializer.validated_data["scenario"]
        message = serializer.validated_data["message"]
        conversation_history = serializer.validated_data.get("conversation_history", [])
        attachments = serializer.validated_data.get("attachments", [])

        account = scenario.account
        api_key = self._get_api_key(request)
        if not api_key:
            return Response({"error": self.API_KEY_MISSING_ERROR}, status=status.HTTP_400_BAD_REQUEST)

        metric_types = build_account_metric_types(account)
        interventions = list(
            Intervention.objects.filter(intervention_category__account=account)
            .annotate(category_name=F("intervention_category__name"))
            .values("id", "name", "category_name")
        )
        current_rules = [
            _rule_to_ai_context(rule) for rule in scenario.rules.order_by("priority").prefetch_related("interventions")
        ]

        try:
            result = generate_scenario_rules(
                message,
                conversation_history,
                metric_types,
                interventions,
                api_key=api_key,
                current_rules=current_rules or None,
                attachments=attachments,
            )
        except Exception as e:
            status_code, body = classify_anthropic_error(
                e, generic_message="Failed to generate scenario rules. Please try again.", logger=logger
            )
            return Response(body, status=status_code)

        if result["rules"] is None:
            return Response(result, status=status.HTTP_200_OK)

        try:
            persisted_rules = persist_scenario_rule_set(
                scenario, result["rules"], request.user, self.get_serializer_context(), metric_types=metric_types
            )
        except serializers.ValidationError as e:
            logger.warning("Scenario Rule AI produced an invalid rule set: %s", e)
            return Response(
                {
                    "error": result["assistant_message"]
                    or "The AI's proposed rules couldn't be saved. Please try rephrasing your request."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "assistant_message": result["assistant_message"],
                "rules": persisted_rules,
                "quick_replies": result["quick_replies"],
                "conversation_history": result["conversation_history"],
            },
            status=status.HTTP_200_OK,
        )

    @extend_schema(
        request=ScenarioRuleRestoreRequestSerializer,
        responses={200: ScenarioRuleRestoreResponseSerializer},
    )
    @action(detail=False, methods=["post"])
    def restore(self, request):
        serializer = ScenarioRuleRestoreRequestSerializer(data=request.data, context=self.get_serializer_context())
        serializer.is_valid(raise_exception=True)
        return Response({"rules": serializer.save()}, status=status.HTTP_200_OK)
