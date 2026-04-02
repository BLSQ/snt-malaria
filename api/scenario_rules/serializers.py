from decimal import Decimal

from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied

from iaso.api.common.serializer_fields import JSONSchemaField
from iaso.models import MetricType, OrgUnit
from plugins.snt_malaria.models import Scenario, ScenarioRule
from plugins.snt_malaria.models.account_settings import get_intervention_org_units
from plugins.snt_malaria.models.scenario import (
    SCENARIO_RULE_MATCHING_CRITERIA_SCHEMA,
    ScenarioRuleInterventionProperties,
)
from plugins.snt_malaria.permissions import SNT_SCENARIO_FULL_WRITE_PERMISSION


class ScenarioRuleInterventionPropertiesSerializer(serializers.ModelSerializer):
    category = serializers.IntegerField(read_only=True, source="intervention.intervention_category_id")
    coverage = serializers.DecimalField(
        max_digits=3, decimal_places=2, min_value=Decimal("0.00"), max_value=Decimal("1.00")
    )

    class Meta:
        model = ScenarioRuleInterventionProperties
        fields = [
            "intervention",
            "category",
            "coverage",
        ]


class ScenarioRuleQuerySerializer(serializers.Serializer):
    scenario = serializers.PrimaryKeyRelatedField(queryset=Scenario.objects.none())

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        user = self.context["request"].user
        account = user.iaso_profile.account
        self.fields["scenario"].queryset = Scenario.objects.filter(account=account)


class ScenarioRuleListSerializer(serializers.ModelSerializer):
    intervention_properties = ScenarioRuleInterventionPropertiesSerializer(many=True, read_only=True)

    class Meta:
        model = ScenarioRule
        fields = [
            "id",
            "scenario",
            "name",
            "priority",
            "color",
            "intervention_properties",
            "matching_criteria",
            "org_units_matched",
            "org_units_excluded",
            "org_units_included",
            "org_units_scope",
        ]


class ScenarioRuleSmallSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScenarioRule
        fields = [
            "id",
            "name",
            "priority",
            "color",
        ]


class ScenarioRuleRetrieveSerializer(serializers.ModelSerializer):
    intervention_properties = ScenarioRuleInterventionPropertiesSerializer(many=True, read_only=True)

    class Meta:
        model = ScenarioRule
        fields = [
            "id",
            "scenario",
            "name",
            "priority",
            "color",
            "intervention_properties",
            "matching_criteria",
            "org_units_matched",
            "org_units_excluded",
            "org_units_included",
            "org_units_scope",
            "created_by",
            "created_at",
            "updated_by",
            "updated_at",
        ]


class ScenarioRulePreviewSerializer(serializers.ModelSerializer):
    matching_criteria = serializers.JSONField(required=False, allow_null=True, default=None)

    class Meta:
        model = ScenarioRule
        fields = [
            "matching_criteria",
            "org_units_excluded",
            "org_units_included",
        ]


class ScenarioRuleWriteSerializerBase(serializers.ModelSerializer):
    """
    Common base for both create and update serializers
    """

    intervention_properties = ScenarioRuleInterventionPropertiesSerializer(many=True, required=True)
    matching_criteria = JSONSchemaField(SCENARIO_RULE_MATCHING_CRITERIA_SCHEMA, required=True, allow_null=True)
    org_units_excluded = serializers.ListField(
        child=serializers.PrimaryKeyRelatedField(queryset=OrgUnit.objects.none()), required=False
    )
    org_units_included = serializers.ListField(
        child=serializers.PrimaryKeyRelatedField(queryset=OrgUnit.objects.none()), required=False
    )
    org_units_scope = serializers.ListField(
        child=serializers.PrimaryKeyRelatedField(queryset=OrgUnit.objects.none()), required=False
    )

    class Meta:
        model = ScenarioRule
        fields = [
            "name",
            "color",
            "intervention_properties",
            "matching_criteria",
            "org_units_excluded",
            "org_units_included",
            "org_units_scope",
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        user = self.context["request"].user
        org_units = get_intervention_org_units(user.iaso_profile.account)
        self.fields["org_units_excluded"].child.queryset = org_units
        self.fields["org_units_included"].child.queryset = org_units
        self.fields["org_units_scope"].child.queryset = org_units

    def validate_intervention_properties(self, intervention_properties):
        covered_interventions = []
        duplicated_interventions = []
        for prop in intervention_properties:
            intervention_id = prop["intervention"].id
            if intervention_id in covered_interventions:
                duplicated_interventions.append(intervention_id)
                continue
            covered_interventions.append(intervention_id)

        if duplicated_interventions:
            raise serializers.ValidationError(f"Duplicated interventions: {duplicated_interventions}")

        return intervention_properties

    def validate_matching_criteria(self, matching_criteria):
        if matching_criteria is None:
            return matching_criteria

        is_match_all = isinstance(matching_criteria, dict) and matching_criteria.get("all")
        if is_match_all:
            return matching_criteria

        user = self.context["request"].user
        account = user.iaso_profile.account
        account_metric_types = MetricType.objects.filter(account=account).values_list("id", flat=True)
        invalid_metric_types = []

        conditions = matching_criteria["and"]
        for condition in conditions:
            operator = next(iter(condition))
            metric_type_id = condition[operator][0]["var"]
            if metric_type_id not in account_metric_types:
                invalid_metric_types.append(metric_type_id)

        if invalid_metric_types:
            raise serializers.ValidationError(f"Invalid metric types: {invalid_metric_types}")

        return matching_criteria


class ScenarioRuleCreateSerializer(ScenarioRuleWriteSerializerBase):
    scenario = serializers.PrimaryKeyRelatedField(queryset=Scenario.objects.none())

    class Meta:
        model = ScenarioRule
        fields = [
            *ScenarioRuleWriteSerializerBase.Meta.fields,
            "scenario",
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        user = self.context["request"].user
        account = user.iaso_profile.account
        self.fields["scenario"].queryset = Scenario.objects.filter(account=account)

    def validate_scenario(self, scenario):
        user = self.context["request"].user
        if scenario.created_by != user and not user.has_perm(SNT_SCENARIO_FULL_WRITE_PERMISSION.full_name()):
            raise PermissionDenied("You don't have permission to edit this scenario")
        return scenario

    def create(self, validated_data, **kwargs):
        intervention_properties_data = validated_data.pop("intervention_properties", [])
        other_values = {
            "priority": validated_data["scenario"].get_next_available_priority(),
            "org_units_excluded": [org_unit.id for org_unit in validated_data.pop("org_units_excluded", [])],
            "org_units_included": [org_unit.id for org_unit in validated_data.pop("org_units_included", [])],
            "org_units_scope": [org_unit.id for org_unit in validated_data.pop("org_units_scope", [])],
        }
        scenario_rule = ScenarioRule.objects.create(**validated_data, **other_values, **kwargs)

        for data in intervention_properties_data:
            ScenarioRuleInterventionProperties.objects.create(
                scenario_rule=scenario_rule,
                intervention=data["intervention"],
                coverage=data["coverage"],
            )

        return scenario_rule


class ScenarioRuleUpdateSerializer(ScenarioRuleWriteSerializerBase):
    # overriding parent fields in order to make them optional
    intervention_properties = ScenarioRuleInterventionPropertiesSerializer(many=True, required=False)
    matching_criteria = JSONSchemaField(SCENARIO_RULE_MATCHING_CRITERIA_SCHEMA, required=False, allow_null=True)
    name = serializers.CharField(required=False, allow_blank=False, allow_null=False)

    class Meta:
        model = ScenarioRule
        fields = [
            *ScenarioRuleWriteSerializerBase.Meta.fields,
        ]

    def update(self, instance, validated_data, **kwargs):
        intervention_properties_data = validated_data.pop("intervention_properties", [])

        other_optional_values = {}
        for field in ["org_units_excluded", "org_units_included", "org_units_scope"]:
            if field in validated_data:
                other_optional_values[field] = [org_unit.id for org_unit in validated_data.pop(field)]

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        for attr, value in other_optional_values.items():
            setattr(instance, attr, value)
        for attr, value in kwargs.items():  # don't pass m2m objects please
            setattr(instance, attr, value)

        instance.save()

        if intervention_properties_data:
            # we don't really care about the ScenarioRuleInterventionProperties objects, we can always delete and recreate them
            instance.intervention_properties.all().delete()

            for data in intervention_properties_data:
                ScenarioRuleInterventionProperties.objects.create(
                    scenario_rule=instance,
                    intervention=data["intervention"],
                    coverage=data["coverage"],
                )

        return instance
