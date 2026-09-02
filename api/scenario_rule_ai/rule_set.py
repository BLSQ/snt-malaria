import random

from typing import Optional

from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from iaso.models import MetricType
from iaso.utils.colors import COLOR_CHOICES, DEFAULT_COLOR
from plugins.snt_malaria.api.scenario_rules.serializers import (
    ScenarioRuleCreateSerializer,
    ScenarioRuleListSerializer,
    ScenarioRuleUpdateSerializer,
)
from plugins.snt_malaria.models import ScenarioRule
from plugins.snt_malaria.services import BudgetCalculationService

from .matching_criteria import matching_criteria_to_jsonlogic


def build_account_metric_types(account) -> list[dict]:
    """The data-layer catalog the manual rule builder can reference as criteria: the planning page
    fetches it via useGetMetricCategories('any'), which despite the name filters to
    metric_kind=ANY - excluding both is_utility layers (e.g. population layers driving budget
    calculations) and metric_kind=POPULATION composites. A layer excluded from either shows no name
    in the UI, so neither the AI nor a restored rule set may reference one the human form can't."""
    return list(
        MetricType.objects.filter(account=account, is_utility=False, metric_kind=MetricType.MetricKind.ANY).values(
            "id", "name", "description", "legend_type", "legend_config"
        )
    )


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
                # Not in the catalog - either a hallucinated id, or a real but is_utility metric
                # type (excluded from the catalog on purpose). Reject rather than silently
                # persisting a rule the UI can't label.
                raise serializers.ValidationError(
                    f'Rule "{spec.get("name")}" references an unknown data layer (id={criterion.get("metric_type")}).'
                )
            if metric_type["legend_type"] == MetricType.LegendType.ORDINAL and criterion.get("operator") != "==":
                # Categorical values (e.g. "Low"/"Medium"/"High") have no numeric ordering to compare
                # with <, <=, >, >= - only equality is meaningful.
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


@transaction.atomic
def persist_scenario_rule_set(scenario, rule_specs: list[dict], context: dict) -> list[dict]:
    """Create/update/delete ScenarioRules so the scenario matches `rule_specs` exactly, reprioritize
    them in the given order (lowest priority first), and refresh assignments + budget once. Raises
    `serializers.ValidationError` (rolling the transaction back) if any rule fails validation.

    Shared by the AI generate endpoint (`ScenarioRuleAIViewSet.create`) and the AI-chat "revert"
    (`ScenarioRuleAIViewSet.restore`) - both hand it a complete desired rule set. `context` must
    carry `request` (the write serializers scope querysets by account from it, and `created_by` /
    `updated_by` come from `request.user`)."""
    user = context["request"].user
    metric_type_by_id = {mt["id"]: mt for mt in build_account_metric_types(scenario.account)}

    existing_by_id = {rule.id: rule for rule in scenario.rules.all()}
    submitted_ids = {spec["id"] for spec in rule_specs if spec.get("id")}

    to_delete_ids = set(existing_by_id) - submitted_ids
    if to_delete_ids:
        ScenarioRule.objects.filter(id__in=to_delete_ids).delete()

    used_colors = {rule.color for rule in existing_by_id.values() if rule.id in submitted_ids}

    saved_rules = []
    for spec in rule_specs:
        payload = _rule_spec_to_payload(spec, metric_type_by_id)
        existing_rule = existing_by_id.get(spec.get("id"))
        org_units_matched = ScenarioRule.resolve_matched_org_units(
            scenario.account, payload["matching_criteria"], data_layer_years=scenario.data_layer_years
        )

        if existing_rule:
            # The rule set is instructed to always carry a color, but tolerate one missing (a purely
            # cosmetic field) by leaving the existing color untouched - the payload has no "color".
            if "color" in payload:
                used_colors.add(payload["color"])
            write_serializer = ScenarioRuleUpdateSerializer(existing_rule, data=payload, context=context)
            write_serializer.is_valid(raise_exception=True)
            rule = write_serializer.save(updated_by=user, org_units_matched=org_units_matched)
        else:
            payload["scenario"] = scenario.id
            if "color" not in payload:
                # A brand new rule has no existing color to fall back to, so auto-pick one distinct
                # from what's already in use.
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
        ScenarioRule.objects.bulk_update_with_deferred_constraint(saved_rules, ["priority", "updated_by", "updated_at"])

    scenario.refresh_assignments(user)
    BudgetCalculationService(scenario).calculate_and_save_all_years(user)

    return ScenarioRuleListSerializer(scenario.rules.order_by("priority"), many=True).data
