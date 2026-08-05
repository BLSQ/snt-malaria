import logging
import random

from typing import Optional

import anthropic

from django.db import transaction
from django.db.models import F
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status, viewsets
from rest_framework.response import Response

from iaso.models import MetricType
from iaso.utils.colors import COLOR_CHOICES, DEFAULT_COLOR
from plugins.snt_malaria.api.scenario_rules.serializers import (
    ScenarioRuleCreateSerializer,
    ScenarioRuleListSerializer,
    ScenarioRuleUpdateSerializer,
)
from plugins.snt_malaria.models import Intervention, ScenarioRule
from plugins.snt_malaria.services import BudgetCalculationService

from .agent import generate_scenario_rules
from .matching_criteria import is_match_all, jsonlogic_to_matching_criteria, matching_criteria_to_jsonlogic
from .permissions import ScenarioRuleAIPermission
from .serializers import ScenarioRuleAIRequestSerializer, ScenarioRuleAIResponseSerializer


logger = logging.getLogger(__name__)


def _pick_new_rule_color(used_colors: set) -> str:
    """Mirrors the frontend's pickRandomPaletteColor (js/src/domains/planning/libs/color-utils.tsx):
    a random palette color not already used by another rule in the scenario, so AI-created rules
    aren't all stuck on the same default color."""
    palette = [choice[0] for choice in COLOR_CHOICES]
    if not palette:
        return DEFAULT_COLOR
    used_lower = {color.lower() for color in used_colors}
    unused = [color for color in palette if color.lower() not in used_lower]
    return random.choice(unused or palette)


def _normalize_color(value) -> Optional[str]:
    """Case-insensitive match against the fixed color palette, returning its canonical (palette)
    casing. None if `value` isn't a string or isn't a real palette color - callers treat that as
    "no color specified" rather than rejecting the whole rule, since color is purely cosmetic."""
    if not isinstance(value, str):
        return None
    value_lower = value.lower()
    for hex_code, _label in COLOR_CHOICES:
        if hex_code.lower() == value_lower:
            return hex_code
    return None


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


def _rule_spec_to_payload(spec: dict, metric_type_by_id: dict) -> dict:
    if not spec.get("interventions"):
        # A rule with no interventions matches org units but assigns nothing - a no-op. Caught here
        # (not just in the prompt) since the model doesn't always follow that instruction, e.g. when
        # proposing a placeholder "baseline" rule.
        raise serializers.ValidationError(f'Rule "{spec.get("name")}" has no interventions and would be a no-op.')

    if spec.get("is_match_all"):
        matching_criteria = {"all": True}
    else:
        criteria = spec.get("matching_criteria") or []
        for criterion in criteria:
            metric_type = metric_type_by_id.get(criterion.get("metric_type"))
            if metric_type is None:
                # Not in the catalog sent to the AI - either a hallucinated id, or a real but
                # is_utility metric type (excluded from the catalog on purpose, see the query in
                # create()). Reject rather than silently persisting a rule the UI can't label.
                raise serializers.ValidationError(
                    f'Rule "{spec.get("name")}" references an unknown data layer (id={criterion.get("metric_type")}).'
                )
            if metric_type["legend_type"] == MetricType.LegendType.ORDINAL and criterion.get("operator") != "==":
                # Categorical values (e.g. "Low"/"Medium"/"High") have no numeric ordering to compare
                # with <, <=, >, >= - only equality is meaningful. Caught here (not just in the
                # prompt) since the model doesn't always follow that instruction.
                raise serializers.ValidationError(
                    f'Rule "{spec.get("name")}" compares the categorical data layer '
                    f'"{metric_type["name"]}" with "{criterion.get("operator")}" - only "==" is valid '
                    "for categorical values."
                )
        matching_criteria = matching_criteria_to_jsonlogic(criteria)
        if matching_criteria is None:
            raise serializers.ValidationError(
                f'Rule "{spec.get("name")}" has no matching criteria and is not match-all.'
            )

    payload = {
        "name": spec.get("name") or "",
        "matching_criteria": matching_criteria,
        "interventions": spec.get("interventions") or [],
    }
    color = _normalize_color(spec.get("color"))
    if color:
        payload["color"] = color
    return payload


@extend_schema(tags=["SNT Malaria"])
class ScenarioRuleAIViewSet(viewsets.ViewSet):
    """AI-powered scenario rule generation.

    Send a natural language message describing the desired scenario rules. The AI sees the account's
    data layer and intervention catalogs plus the scenario's current rules (definitions only, never
    resolved org units or data values), and generates the complete desired rule set for the scenario,
    which is persisted immediately - creating, updating, deleting, and reprioritizing rules as needed.
    """

    permission_classes = [ScenarioRuleAIPermission]

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

        account = scenario.account
        api_key = account.anthropic_api_key or None
        if not api_key:
            return Response(
                {
                    "error": "Scenario Rule AI API key is not configured for this account. Please contact your administrator."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Match exactly what the rule builder itself can reference as criteria - the planning page's
        # own catalog (metricTypeCategories, used by MatchingCriteriaForm/ScenarioRuleLine) is fetched
        # via useGetMetricCategories('any'), which despite the name filters to metric_kind=ANY, not
        # "any kind": it excludes both is_utility layers (e.g. population layers driving budget
        # calculations) and metric_kind=POPULATION ones (composites created with the "is population"
        # toggle). A layer excluded from either shows no name in the UI, so the AI must never be
        # offered - or allowed to reference - one the human rule form can't select either.
        metric_types = list(
            MetricType.objects.filter(account=account, is_utility=False, metric_kind=MetricType.MetricKind.ANY).values(
                "id", "name", "description", "legend_type", "legend_config"
            )
        )
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
            )
        except anthropic.APIStatusError as e:
            if e.status_code == 503:
                logger.warning("Claude API returned 503")
                return Response(
                    {"error": "The AI service is temporarily unavailable. Please try again later."},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
            if e.status_code == 400:
                # A persistent configuration problem (e.g. an invalid/out-of-credit API key) rather
                # than a transient failure - "try again" would be misleading. The account's Anthropic
                # key is an admin-level config the end user has no visibility or control over, so log
                # Anthropic's own detail for an admin to diagnose, but never show it to the user.
                logger.error("Claude API rejected the request: %s", e)
                return Response(
                    {"error": "The AI service rejected this request. Please contact your administrator."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            logger.exception("Scenario Rule AI error")
            return Response(
                {"error": "Failed to generate scenario rules. Please try again."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception:
            logger.exception("Scenario Rule AI error")
            return Response(
                {"error": "Failed to generate scenario rules. Please try again."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if result["rules"] is None:
            return Response(result, status=status.HTTP_200_OK)

        metric_type_by_id = {metric_type["id"]: metric_type for metric_type in metric_types}
        try:
            persisted_rules = self._persist_rules(scenario, result["rules"], request.user, metric_type_by_id)
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
                "conversation_history": result["conversation_history"],
            },
            status=status.HTTP_200_OK,
        )

    @transaction.atomic
    def _persist_rules(self, scenario, rule_specs: list[dict], user, metric_type_by_id: dict) -> list[dict]:
        """Create/update/delete ScenarioRules to match `rule_specs` exactly, reprioritize them in the
        given order, and refresh assignments/budget once. Raises `serializers.ValidationError` (and
        rolls back) if any rule fails validation."""
        existing_by_id = {rule.id: rule for rule in scenario.rules.all()}
        submitted_ids = {spec["id"] for spec in rule_specs if spec.get("id")}

        to_delete_ids = set(existing_by_id) - submitted_ids
        if to_delete_ids:
            ScenarioRule.objects.filter(id__in=to_delete_ids).delete()

        used_colors = {rule.color for rule_id, rule in existing_by_id.items() if rule_id in submitted_ids}

        context = self.get_serializer_context()
        saved_rules = []
        for spec in rule_specs:
            payload = _rule_spec_to_payload(spec, metric_type_by_id)
            existing_rule = existing_by_id.get(spec.get("id"))
            org_units_matched = ScenarioRule.resolve_matched_org_units(
                scenario.account, payload["matching_criteria"], reference_year=scenario.reference_year
            )

            if existing_rule:
                # The AI is instructed to always choose a color, but tolerate it omitting one (a
                # purely cosmetic field, not worth failing the rule over) by leaving the existing
                # color untouched - the payload simply has no "color" key in that case.
                if "color" in payload:
                    used_colors.add(payload["color"])
                write_serializer = ScenarioRuleUpdateSerializer(existing_rule, data=payload, context=context)
                write_serializer.is_valid(raise_exception=True)
                rule = write_serializer.save(updated_by=user, org_units_matched=org_units_matched)
            else:
                payload["scenario"] = scenario.id
                if "color" not in payload:
                    # Same tolerance as above, but a brand new rule has no existing color to fall
                    # back to, so auto-pick one distinct from what's already in use.
                    payload["color"] = _pick_new_rule_color(used_colors)
                used_colors.add(payload["color"])
                write_serializer = ScenarioRuleCreateSerializer(data=payload, context=context)
                write_serializer.is_valid(raise_exception=True)
                rule = write_serializer.save(created_by=user, org_units_matched=org_units_matched)
            saved_rules.append(rule)

        now = timezone.now()
        for index, rule in enumerate(saved_rules, start=1):
            rule.priority = index
            rule.updated_by = user
            rule.updated_at = now
        if saved_rules:
            ScenarioRule.objects.bulk_update_with_deferred_constraint(
                saved_rules, ["priority", "updated_by", "updated_at"]
            )

        scenario.refresh_assignments(user)
        BudgetCalculationService(scenario).calculate_and_save_all_years(user)

        return ScenarioRuleListSerializer(scenario.rules.order_by("priority"), many=True).data
