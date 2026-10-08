from django.db import transaction
from rest_framework import serializers

from plugins.snt_malaria.models import (
    Grant,
    Intervention,
    InterventionCostBreakdownLine,
    ScenarioRuleCostOverride,
    ScenarioRuleIntervention,
)
from plugins.snt_malaria.models.cost_breakdown import MAX_COVERAGE_PERCENTAGE
from plugins.snt_malaria.models.scenario_rule_cost_override import OVERRIDE_VALUE_FIELDS


def _account(serializer):
    return serializer.context["request"].user.iaso_profile.account


def _optional_decimal(max_digits, decimal_places):
    return serializers.DecimalField(
        max_digits=max_digits,
        decimal_places=decimal_places,
        min_value=0,
        required=False,
        allow_null=True,
        default=None,
    )


class CostLineOverrideSerializer(serializers.Serializer):
    cost_line = serializers.PrimaryKeyRelatedField(queryset=InterventionCostBreakdownLine.objects.none())
    unit_cost = _optional_decimal(19, 2)
    conversion_factor = _optional_decimal(19, 6)
    buffer = _optional_decimal(5, 2)
    coverage = _optional_decimal(19, 2)
    yearly_coverage = serializers.DictField(
        child=serializers.DecimalField(max_digits=19, decimal_places=2, min_value=0),
        required=False,
        default=dict,
    )

    def get_fields(self):
        fields = super().get_fields()
        fields["cost_line"].queryset = InterventionCostBreakdownLine.objects.filter(
            intervention__intervention_category__account=_account(self)
        )
        return fields

    def validate_yearly_coverage(self, yearly_coverage):
        try:
            return {int(year): coverage for year, coverage in yearly_coverage.items()}
        except ValueError:
            raise serializers.ValidationError("Years must be integers.")

    def validate(self, attrs):
        if not attrs["cost_line"].is_proportional:
            if attrs.get("conversion_factor") is not None:
                raise serializers.ValidationError({"conversion_factor": "Does not apply to a fixed cost item."})
            return attrs
        errors = {}
        coverage = attrs.get("coverage")
        if coverage is not None and coverage > MAX_COVERAGE_PERCENTAGE:
            errors["coverage"] = "Coverage cannot exceed 100%."
        if any(value > MAX_COVERAGE_PERCENTAGE for value in attrs.get("yearly_coverage", {}).values()):
            errors["yearly_coverage"] = "Coverage cannot exceed 100%."
        if errors:
            raise serializers.ValidationError(errors)
        return attrs


class InterventionOverrideSerializer(serializers.Serializer):
    intervention = serializers.PrimaryKeyRelatedField(queryset=Intervention.objects.none())
    deployment_years = serializers.ListField(
        child=serializers.IntegerField(), required=False, allow_null=True, default=None
    )
    grant = serializers.PrimaryKeyRelatedField(
        queryset=Grant.objects.none(), required=False, allow_null=True, default=None
    )
    cost_lines = CostLineOverrideSerializer(many=True, required=False, default=list)

    def get_fields(self):
        fields = super().get_fields()
        account = _account(self)
        fields["intervention"].queryset = Intervention.objects.filter(intervention_category__account=account)
        fields["grant"].queryset = Grant.objects.filter(account=account)
        return fields

    def validate(self, attrs):
        intervention = attrs["intervention"]
        cost_lines = attrs.get("cost_lines", [])
        cost_line_ids = [cost_line["cost_line"].id for cost_line in cost_lines]
        if len(cost_line_ids) != len(set(cost_line_ids)):
            raise serializers.ValidationError({"cost_lines": "Each cost item can only be listed once."})
        if any(cost_line["cost_line"].intervention_id != intervention.id for cost_line in cost_lines):
            raise serializers.ValidationError({"cost_lines": "Cost items must belong to the intervention."})
        return attrs


def validate_intervention_overrides(intervention_overrides, intervention_ids, scenario):
    for override in intervention_overrides:
        if override["intervention"].id not in intervention_ids:
            raise serializers.ValidationError(f"Intervention {override['intervention'].id} is not part of the rule.")
        years = list(override.get("deployment_years") or [])
        for cost_line in override.get("cost_lines", []):
            years.extend(cost_line.get("yearly_coverage", {}).keys())
        out_of_range = sorted({year for year in years if year not in scenario.years})
        if out_of_range:
            raise serializers.ValidationError(f"Years {out_of_range} are outside of the scenario period.")
    intervention_override_ids = [override["intervention"].id for override in intervention_overrides]
    if len(intervention_override_ids) != len(set(intervention_override_ids)):
        raise serializers.ValidationError("Each intervention can only be listed once.")


def _normalize_deployment_years(deployment_years, scenario):
    if deployment_years is None:
        return None
    years = sorted(set(deployment_years))
    if years == list(scenario.years):
        return None
    return years


def _cost_override_rows(rule_intervention, cost_line_data):
    rows = []
    all_years_values = {field: cost_line_data.get(field) for field in OVERRIDE_VALUE_FIELDS}
    if any(value is not None for value in all_years_values.values()):
        rows.append(
            ScenarioRuleCostOverride(
                rule_intervention=rule_intervention, cost_line=cost_line_data["cost_line"], **all_years_values
            )
        )
    rows.extend(
        ScenarioRuleCostOverride(
            rule_intervention=rule_intervention, cost_line=cost_line_data["cost_line"], year=year, coverage=coverage
        )
        for year, coverage in cost_line_data.get("yearly_coverage", {}).items()
    )
    return rows


@transaction.atomic
def save_intervention_overrides(rule, intervention_overrides):
    """Replaces the rule's overrides; interventions that are not listed go back to their defaults."""
    overrides_by_intervention_id = {override["intervention"].id: override for override in intervention_overrides}
    rule_interventions = list(ScenarioRuleIntervention.objects.filter(scenario_rule=rule))
    ScenarioRuleCostOverride.objects.filter(rule_intervention__in=rule_interventions).delete()

    rows = []
    for rule_intervention in rule_interventions:
        override = overrides_by_intervention_id.get(rule_intervention.intervention_id, {})
        rule_intervention.deployment_years = _normalize_deployment_years(
            override.get("deployment_years"), rule.scenario
        )
        rule_intervention.grant = override.get("grant")
        for cost_line_data in override.get("cost_lines", []):
            rows.extend(_cost_override_rows(rule_intervention, cost_line_data))

    ScenarioRuleIntervention.objects.bulk_update(rule_interventions, ["deployment_years", "grant"])
    ScenarioRuleCostOverride.objects.bulk_create(rows)


def _to_number(value):
    return None if value is None else float(value)


def intervention_overrides_representation(rule):
    """Groups a rule's overrides per intervention and cost item, leaving out interventions on defaults."""
    representation = []
    for rule_intervention in rule.scenarioruleintervention_set.all():
        cost_lines = {}
        for override in rule_intervention.cost_overrides.all():
            entry = cost_lines.setdefault(
                override.cost_line_id,
                {"cost_line": override.cost_line_id, **dict.fromkeys(OVERRIDE_VALUE_FIELDS), "yearly_coverage": {}},
            )
            if override.year is None:
                entry.update({field: _to_number(getattr(override, field)) for field in OVERRIDE_VALUE_FIELDS})
            else:
                entry["yearly_coverage"][str(override.year)] = _to_number(override.coverage)
        if rule_intervention.deployment_years is None and rule_intervention.grant_id is None and not cost_lines:
            continue
        representation.append(
            {
                "intervention": rule_intervention.intervention_id,
                "deployment_years": rule_intervention.deployment_years,
                "grant": rule_intervention.grant_id,
                "cost_lines": list(cost_lines.values()),
            }
        )
    return representation
