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
