from rest_framework import serializers

from plugins.snt_malaria.models import Intervention, InterventionCostBreakdownLine


class InterventionCostBreakdownLineSerializer(serializers.ModelSerializer):
    category = serializers.ChoiceField(
        choices=InterventionCostBreakdownLine.InterventionCostBreakdownLineCategory.choices,
        required=True,
    )

    class Meta:
        model = InterventionCostBreakdownLine
        fields = ["id", "name", "unit_cost", "category"]


class InterventionCostBreakdownLinesWriteSerializer(serializers.ModelSerializer):
    intervention = serializers.PrimaryKeyRelatedField(queryset=Intervention.objects.all(), required=True)
    costs = InterventionCostBreakdownLineSerializer(many=True)

    class Meta:
        model = InterventionCostBreakdownLine
        fields = ["intervention", "costs"]
