import random

from collections import defaultdict
from typing import Optional

from django.db import transaction
from django.db.models import F
from django.utils import timezone
from rest_framework import serializers

from iaso.models import MetricType
from iaso.utils.colors import COLOR_CHOICES, DEFAULT_COLOR
from plugins.snt_malaria.api.scenario_rules.serializers import (
    ScenarioRuleCreateSerializer,
    ScenarioRuleListSerializer,
    ScenarioRuleUpdateSerializer,
)
from plugins.snt_malaria.models import (
    Grant,
    Intervention,
    InterventionCostBreakdownLine,
    ScenarioRule,
    ScenarioRuleCostOverride,
)
from plugins.snt_malaria.models.account_settings import get_intervention_org_units
from plugins.snt_malaria.models.scenario_rule_cost_override import OVERRIDE_VALUE_FIELDS
from plugins.snt_malaria.services import BudgetCalculationService

from .matching_criteria import jsonlogic_to_matching_criteria, matching_criteria_to_jsonlogic


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


def build_account_interventions(account) -> list[dict]:
    interventions = list(
        Intervention.objects.filter(intervention_category__account=account)
        .annotate(category_name=F("intervention_category__name"), grant_name=F("grant__name"))
        .values("id", "name", "category_name", "grant_name")
    )
    cost_lines_by_intervention_id = defaultdict(list)
    cost_lines = (
        InterventionCostBreakdownLine.objects.filter(intervention__intervention_category__account=account)
        .order_by("id")
        .values(
            "id",
            "intervention_id",
            "name",
            "is_proportional",
            "unit_cost",
            "coverage",
            "conversion_factor",
            "invert_conversion_factor",
            "buffer",
        )
    )
    for cost_line in cost_lines:
        cost_lines_by_intervention_id[cost_line.pop("intervention_id")].append(cost_line)
    for intervention in interventions:
        intervention["cost_lines"] = cost_lines_by_intervention_id[intervention["id"]]
    return interventions


def build_account_grants(account) -> list[dict]:
    return list(
        Grant.objects.filter(account=account)
        .annotate(donor_name=F("donor__name"))
        .values("id", "name", "short_name", "donor_name")
    )


def build_account_org_units(account) -> list[dict]:
    """The org units a rule can hand-pick - the same ones the manual rule builder's org unit tree offers."""
    return list(
        get_intervention_org_units(account)
        .annotate(parent_name=F("parent__name"))
        .order_by("name", "id")
        .values("id", "name", "parent_name")
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


def _rule_spec_to_payload(spec: dict, metric_type_by_id: dict, account_org_unit_ids: list[int]) -> dict:
    if not spec.get("interventions"):
        # A rule with no interventions matches org units but assigns nothing - a no-op. Caught here
        # (not just in the prompt) since the model doesn't always follow that instruction, e.g. when
        # proposing a placeholder "baseline" rule.
        raise serializers.ValidationError(f'Rule "{spec.get("name")}" has no interventions and would be a no-op.')

    payload = {
        "name": spec.get("name") or "",
        "interventions": spec.get("interventions") or [],
        **_org_unit_selection_payload(spec, metric_type_by_id, account_org_unit_ids),
    }

    payload["intervention_overrides"] = [
        _intervention_override_payload(override) for override in spec.get("intervention_overrides") or []
    ]

    color = _normalize_color(spec.get("color"))
    if color:
        payload["color"] = color
    return payload


def _org_unit_selection_payload(spec: dict, metric_type_by_id: dict, account_org_unit_ids: list[int]) -> dict:
    """Translate the AI's selection into the stored fields. There is no "match all" sentinel in
    matching_criteria: match-all is resolved here into an explicit snapshot of every org unit id (minus
    the excluded ones), the same way the manual rule builder stores it."""
    included = spec.get("org_units_included") or []
    excluded = spec.get("org_units_excluded") or []

    if spec.get("is_match_all"):
        excluded_ids = set(excluded)
        included = [org_unit_id for org_unit_id in account_org_unit_ids if org_unit_id not in excluded_ids]
        return {"matching_criteria": None, "org_units_included": included, "org_units_excluded": []}

    criteria = spec.get("matching_criteria") or []
    _validate_criteria(spec, criteria, metric_type_by_id)
    matching_criteria = matching_criteria_to_jsonlogic(criteria)
    if matching_criteria is None:
        if not included:
            raise serializers.ValidationError(
                f'Rule "{spec.get("name")}" has no matching criteria, no hand-picked org units and is not match-all.'
            )
        excluded = []
    return {"matching_criteria": matching_criteria, "org_units_included": included, "org_units_excluded": excluded}


def org_unit_selection_to_ai_context(rule: ScenarioRule, account_org_unit_ids: list[int]) -> dict:
    """The inverse of _org_unit_selection_payload. A rule without criteria stores its org units as one
    explicit list, which is shown as match-all minus exclusions whenever that is the shorter of the two
    (e.g. "every district but two")."""
    if rule.matching_criteria is not None:
        return {
            "is_match_all": False,
            "matching_criteria": jsonlogic_to_matching_criteria(rule.matching_criteria),
            "org_units_included": rule.org_units_included,
            "org_units_excluded": rule.org_units_excluded,
        }

    included_ids = set(rule.org_units_included)
    not_included = [org_unit_id for org_unit_id in account_org_unit_ids if org_unit_id not in included_ids]
    is_match_all = len(not_included) < len(included_ids)
    return {
        "is_match_all": is_match_all,
        "matching_criteria": [],
        "org_units_included": [] if is_match_all else rule.org_units_included,
        "org_units_excluded": not_included if is_match_all else [],
    }


def _validate_criteria(spec: dict, criteria: list[dict], metric_type_by_id: dict) -> None:
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


def _round_to_stored_precision(field: str, value):
    """Values the AI derives from a relative change (e.g. "+10%") often carry more digits than the
    override serializer accepts."""
    if value is None:
        return None
    return round(value, ScenarioRuleCostOverride._meta.get_field(field).decimal_places)


def _intervention_override_payload(override: dict) -> dict:
    return {
        "intervention": override.get("intervention"),
        "grant": override.get("grant"),
        "deployment_years": override.get("deployment_years"),
        "cost_lines": [
            {
                "cost_line": cost_line.get("cost_line"),
                **{field: _round_to_stored_precision(field, cost_line.get(field)) for field in OVERRIDE_VALUE_FIELDS},
                "yearly_coverage": {
                    str(year): _round_to_stored_precision("coverage", coverage)
                    for year, coverage in (cost_line.get("yearly_coverage") or {}).items()
                },
            }
            for cost_line in override.get("cost_lines") or []
        ],
    }


def _drop_no_op_org_unit_overrides(payload: dict, org_units_matched: list[int]) -> None:
    """Mirrors the manual rule builder's pruneNoOpOverrides: excluding an org unit the criteria don't
    match, or including one they already match, changes nothing - and the AI can't tell which is which."""
    if payload["matching_criteria"] is None:
        return
    matched = set(org_units_matched)
    payload["org_units_excluded"] = [
        org_unit_id for org_unit_id in payload["org_units_excluded"] if org_unit_id in matched
    ]
    payload["org_units_included"] = [
        org_unit_id for org_unit_id in payload["org_units_included"] if org_unit_id not in matched
    ]


@transaction.atomic
def persist_scenario_rule_set(scenario, rule_specs: list[dict], context: dict) -> list[dict]:
    """Create/update/delete ScenarioRules so the scenario matches `rule_specs` exactly, reprioritize
    them in the given order (lowest priority first), and refresh assignments + budget once. Raises
    `serializers.ValidationError` (rolling the transaction back) if any rule fails validation.

    Shared by the AI generate endpoint (`ScenarioRuleAIViewSet.create`) and the AI-chat "revert"
    (`ScenarioRuleAIViewSet.restore`) - both hand it a complete desired rule set. `context` must
    carry `request` (the write serializers scope querysets by account from it, and `created_by` /
    `updated_by` come from `request.user`). It may also carry `account_org_unit_ids` when the caller
    already resolved them."""
    user = context["request"].user
    metric_type_by_id = {mt["id"]: mt for mt in build_account_metric_types(scenario.account)}
    account_org_unit_ids = context.get("account_org_unit_ids")
    if account_org_unit_ids is None:
        account_org_unit_ids = ScenarioRule.resolve_all_org_unit_ids(scenario.account)
    # Shared by every write serializer instantiated below, so none of them need to re-resolve it
    # (e.g. ScenarioRuleUpdateSerializer clearing a stale match-all org_units_included snapshot).
    context = {**context, "account_org_unit_ids": account_org_unit_ids}

    existing_by_id = {rule.id: rule for rule in scenario.rules.all()}
    submitted_ids = {spec["id"] for spec in rule_specs if spec.get("id")}

    to_delete_ids = set(existing_by_id) - submitted_ids
    if to_delete_ids:
        ScenarioRule.objects.filter(id__in=to_delete_ids).delete()

    used_colors = {rule.color for rule in existing_by_id.values() if rule.id in submitted_ids}

    saved_rules = []
    for spec in rule_specs:
        existing_rule = existing_by_id.get(spec.get("id"))
        payload = _rule_spec_to_payload(spec, metric_type_by_id, account_org_unit_ids)
        org_units_matched = ScenarioRule.resolve_matched_org_units(
            scenario.account, payload["matching_criteria"], data_layer_years=scenario.data_layer_years
        )
        _drop_no_op_org_unit_overrides(payload, org_units_matched)

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

    rules = scenario.rules.order_by("priority").prefetch_related(
        "interventions", "scenarioruleintervention_set__cost_overrides"
    )
    return ScenarioRuleListSerializer(rules, many=True, context=context).data
