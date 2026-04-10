from rest_framework import serializers

from plugins.snt_malaria.api.intervention_cost_breakdown_line.serializers import InterventionCostBreakdownLineSerializer
from plugins.snt_malaria.models import Intervention


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
            "impact_ref",
            "cost_breakdown_lines",
        ]


class InterventionDetailWriteSerializer(serializers.ModelSerializer):
    cost_breakdown_lines = InterventionCostBreakdownLineSerializer(many=True)

    class Meta:
        model = Intervention
        fields = [
            "id",
            "name",
            "impact_ref",
            "cost_breakdown_lines",
        ]

    def create(self, validated_data):
        cost_breakdown_lines_data = validated_data.pop("cost_breakdown_lines", [])
        intervention = super().create(validated_data)
        for line_data in cost_breakdown_lines_data:
            InterventionCostBreakdownLineSerializer.create(
                InterventionCostBreakdownLineSerializer(), validated_data={**line_data, "intervention": intervention}
            )
        return intervention

    def update(self, instance, validated_data):
        cost_breakdown_lines_data = validated_data.pop("cost_breakdown_lines", [])
        intervention = super().update(instance, validated_data)

        # Delete existing cost breakdown lines and create new ones based on the provided data
        instance.cost_breakdown_lines.all().delete()
        for line_data in cost_breakdown_lines_data:
            InterventionCostBreakdownLineSerializer.create(
                InterventionCostBreakdownLineSerializer(), validated_data={**line_data, "intervention": intervention}
            )

        return intervention
