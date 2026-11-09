from django.db import transaction
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from plugins.snt_malaria.api.intervention_cost_breakdown_line.serializers import (
    InterventionCostBreakdownLineSerializer,
    InterventionCostBreakdownLineWriteSerializer,
)
from plugins.snt_malaria.models import Grant, Intervention, InterventionCostBreakdownLine, Scenario, ScenarioRule
from plugins.snt_malaria.providers.impact import get_provider_for_account
from plugins.snt_malaria.services.intervention_deletion import delete_intervention


class InterventionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Intervention
        fields = [
            "id",
            "name",
            "short_name",
            "code",
            "description",
            "intervention_category",
            "target_population",
            "grant",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "target_population",
            "grant",
            "created_at",
            "updated_at",
        ]

    def validate_intervention_category(self, intervention_category):
        account = self.context["request"].user.iaso_profile.account
        if intervention_category.account_id != account.id:
            raise serializers.ValidationError(_("Intervention category not found."))
        return intervention_category


class InterventionDetailSerializer(serializers.ModelSerializer):
    cost_breakdown_lines = InterventionCostBreakdownLineSerializer(many=True, read_only=True)

    class Meta:
        model = Intervention
        fields = [
            "id",
            "name",
            "code",
            "impact_ref",
            "target_population",
            "grant",
            "cost_breakdown_lines",
        ]


class InterventionDetailWriteSerializer(serializers.ModelSerializer):
    cost_breakdown_lines = InterventionCostBreakdownLineWriteSerializer(many=True, required=False)
    target_population = serializers.ListField(
        child=serializers.CharField(max_length=100), allow_empty=True, required=False
    )
    grant = serializers.PrimaryKeyRelatedField(queryset=Grant.objects.all(), allow_null=True, required=False)

    class Meta:
        model = Intervention
        fields = [
            "id",
            "name",
            "impact_ref",
            "target_population",
            "grant",
            "cost_breakdown_lines",
        ]

    def validate_grant(self, grant):
        if grant is None:
            return grant
        account = self.context["request"].user.iaso_profile.account
        if grant.account_id != account.id:
            raise serializers.ValidationError(_("Grant not found."))
        return grant

    def validate_impact_ref(self, impact_ref):
        impact_ref = impact_ref.strip()
        if not impact_ref:
            return impact_ref
        provider = get_provider_for_account(self.context["request"].user.iaso_profile.account)
        if provider is not None and not provider.is_known_impact_ref(impact_ref):
            raise serializers.ValidationError(_("Unknown impact reference for the configured impact provider."))
        return impact_ref

    def update(self, instance, validated_data):
        cost_breakdown_lines_data = validated_data.pop("cost_breakdown_lines", None)

        with transaction.atomic():
            intervention = super().update(instance, validated_data)

            if cost_breakdown_lines_data is not None:
                for line_data in cost_breakdown_lines_data:
                    line_data["intervention"] = intervention

                self.fields["cost_breakdown_lines"].update(
                    intervention.cost_breakdown_lines.all(),
                    cost_breakdown_lines_data,
                )

        return intervention


class InterventionDuplicateSerializer(serializers.Serializer):
    """Deep-copies an intervention (basic fields + every cost breakdown line) under a unique name.

    The source intervention is passed through the serializer context as ``source``.
    """

    _COPY_FIELDS = ["short_name", "code", "impact_ref", "description", "grant"]
    _COPY_LINE_FIELDS = [
        "name",
        "category",
        "unit_type",
        "population_layer",
        "unit_cost",
        "is_proportional",
        "conversion_factor",
        "invert_conversion_factor",
        "coverage",
        "buffer",
    ]

    def create(self, validated_data):
        source = self.context["source"]
        created_by = validated_data["created_by"]

        with transaction.atomic():
            duplicate = Intervention.objects.create(
                intervention_category=source.intervention_category,
                created_by=created_by,
                name=self._build_unique_name(source),
                target_population=list(source.target_population),
                **{field: getattr(source, field) for field in self._COPY_FIELDS},
            )

            InterventionCostBreakdownLine.objects.bulk_create(
                [
                    InterventionCostBreakdownLine(
                        intervention=duplicate,
                        created_by=created_by,
                        updated_by=created_by,
                        **{field: getattr(line, field) for field in self._COPY_LINE_FIELDS},
                    )
                    for line in source.cost_breakdown_lines.all()
                ]
            )

        return duplicate

    @staticmethod
    def _build_unique_name(source):
        taken_names = set(
            Intervention.objects.filter(intervention_category=source.intervention_category).values_list(
                "name", flat=True
            )
        )
        base_name = f"{source.name} (copy)"
        candidate = base_name
        suffix = 2
        while candidate in taken_names:
            candidate = f"{base_name} {suffix}"
            suffix += 1
        return candidate


class InterventionUsageRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScenarioRule
        fields = ["id", "name", "color", "interventions"]


class InterventionUsageScenarioSerializer(serializers.ModelSerializer):
    """Active scenario using an intervention; expects ``rules_using_intervention`` prefetched."""

    rules = InterventionUsageRuleSerializer(source="rules_using_intervention", many=True)

    class Meta:
        model = Scenario
        fields = ["id", "name", "rules"]


class InterventionDeleteSerializer(serializers.Serializer):
    """Deletes the intervention passed through the serializer context as ``intervention``."""

    replace_with = serializers.PrimaryKeyRelatedField(queryset=Intervention.objects.all(), required=False)
    remove_from_rules = serializers.BooleanField(default=False)

    def validate_replace_with(self, replacement):
        account = self.context["request"].user.iaso_profile.account
        if replacement.intervention_category.account_id != account.id:
            raise serializers.ValidationError(_("Intervention not found."))
        if replacement == self.context["intervention"]:
            raise serializers.ValidationError(_("An intervention cannot replace itself."))
        return replacement

    def validate(self, attrs):
        replace_with = attrs.get("replace_with")
        if replace_with and attrs["remove_from_rules"]:
            raise serializers.ValidationError(_("Either replace the intervention or remove it from the rules."))
        if replace_with or attrs["remove_from_rules"]:
            self._validate_no_locked_scenario()
        return attrs

    def _validate_no_locked_scenario(self):
        locked_scenario_names = list(
            Scenario.objects.filter(is_locked=True, rules__interventions=self.context["intervention"])
            .distinct()
            .order_by("name")
            .values_list("name", flat=True)
        )
        if locked_scenario_names:
            raise serializers.ValidationError(
                _("Unlock these scenarios first: %(names)s") % {"names": ", ".join(locked_scenario_names)}
            )

    def create(self, validated_data):
        delete_intervention(
            self.context["intervention"],
            self.context["request"].user,
            replace_with=validated_data.get("replace_with"),
            remove_from_active_rules=validated_data["remove_from_rules"],
        )
        return self.context["intervention"]
