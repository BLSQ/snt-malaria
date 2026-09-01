from django.db import transaction
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from plugins.snt_malaria.api.intervention_cost_breakdown_line.serializers import (
    InterventionCostBreakdownLineSerializer,
    InterventionCostBreakdownLineWriteSerializer,
)
from plugins.snt_malaria.models import Grant, Intervention, InterventionCostBreakdownLine


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
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "target_population",
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
