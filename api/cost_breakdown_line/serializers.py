from rest_framework import serializers

from plugins.snt_malaria.models import CostBreakdownLine, Intervention


class CostBreakdownLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = CostBreakdownLine
        fields = ["id", "name", "unit_cost", "category"]


class CostBreakdownLinesWriteSerializer(serializers.ModelSerializer):
    intervention = serializers.PrimaryKeyRelatedField(queryset=Intervention.objects.all(), required=True)
    costs = CostBreakdownLineSerializer(many=True)

    class Meta:
        model = CostBreakdownLine
        fields = ["intervention", "costs"]

    def validate_intervention(self, intervention):
        if not intervention:
            raise serializers.ValidationError("Invalid intervention ID.")
        return intervention
