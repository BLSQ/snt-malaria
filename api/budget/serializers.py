from rest_framework import exceptions, serializers

from plugins.snt_malaria.models.budget import Budget
from plugins.snt_malaria.permissions import SNT_SCENARIO_FULL_WRITE_PERMISSION


class BudgetSerializer(serializers.ModelSerializer):
    """Serializer for displaying Budget instances"""

    class Meta:
        model = Budget
        fields = [
            "id",
            "name",
            "scenario",
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

        user = self.context["request"].user
        if value.created_by != user and not user.has_perm(SNT_SCENARIO_FULL_WRITE_PERMISSION.full_name()):
            raise exceptions.PermissionDenied()

        if not value.intervention_assignments.exists():
            raise serializers.ValidationError("Scenario must have at least one intervention assignment.")

        return value
