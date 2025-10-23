from rest_framework import serializers

from plugins.snt_malaria.models.budget import Budget


class BudgetSerializer(serializers.ModelSerializer):
    """Serializer for displaying Budget instances"""

    class Meta:
        model = Budget
        fields = [
            "id",
            "name",
            "scenario",
            "cost_input",
            "assumptions",
            "results",
            "updated_at",
        ]


class BudgetCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating Budget instances - only requires scenario"""

    class Meta:
        model = Budget
        fields = ["scenario"]

    def validate_scenario(self, value):
        if (value.start_year is None) or (value.end_year is None):
            raise serializers.ValidationError("Scenario must have start_year and end_year defined.")

        return value
