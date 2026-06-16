from django.db import transaction
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from plugins.snt_malaria.api.intervention_cost_breakdown_line.serializers import (
    InterventionCostBreakdownLineSerializer,
    InterventionCostBreakdownLineWriteSerializer,
)
from plugins.snt_malaria.models import Grant, Intervention


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
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]


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
