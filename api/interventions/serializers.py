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
