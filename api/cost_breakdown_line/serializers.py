from rest_framework import serializers

from plugins.snt_malaria.models import Intervention, InterventionCostBreakdownLine


class InterventionCostBreakdownLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = InterventionCostBreakdownLine
        fields = ["id", "name", "unit_cost", "category"]


class InterventionCostBreakdownLinesWriteSerializer(serializers.ModelSerializer):
    intervention = serializers.PrimaryKeyRelatedField(queryset=Intervention.objects.all(), required=True)
    costs = InterventionCostBreakdownLineSerializer(many=True)

    class Meta:
        model = InterventionCostBreakdownLine
        fields = ["intervention", "costs"]

    def validate_intervention(self, intervention):
        if not intervention:
            raise serializers.ValidationError("Invalid intervention ID.")
        return intervention

    def validate_costs(self, costs):
        if not isinstance(costs, list) or not all(isinstance(cost, dict) for cost in costs):
            raise serializers.ValidationError("Costs must be a list of cost objects.")

        for cost in costs:
            if "name" not in cost:
                raise serializers.ValidationError("Each cost object must have a 'name' field.")
            if "unit_cost" not in cost:
                raise serializers.ValidationError("Each cost object must have a 'unit_cost' field.")
            if "category" not in cost:
                raise serializers.ValidationError("Each cost object must have a 'category' field.")

        return costs
