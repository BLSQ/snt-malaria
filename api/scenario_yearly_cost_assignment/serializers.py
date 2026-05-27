from rest_framework import serializers

from plugins.snt_malaria.models import InterventionCostBreakdownLine, Scenario, ScenarioYearlyCostAssignment
from plugins.snt_malaria.models.intervention import Intervention


class ScenarioYearlyCostAssignmentSerializer(serializers.ModelSerializer):
    cost_line = serializers.PrimaryKeyRelatedField(queryset=InterventionCostBreakdownLine.objects.none())
    scenario = serializers.PrimaryKeyRelatedField(queryset=Scenario.objects.none())

    class Meta:
        model = ScenarioYearlyCostAssignment
        fields = ["id", "scenario", "year", "cost_line", "value"]
        read_only_fields = ["id"]

    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get("request")
        if request:
            account = request.user.iaso_profile.account
            fields["scenario"].queryset = Scenario.objects.filter(account=account)
            fields["cost_line"].queryset = InterventionCostBreakdownLine.objects.select_related(
                "intervention__intervention_category"
            ).filter(intervention__intervention_category__account=account)
        return fields


class ScenarioYearlyCostAssignmentQuerySerializer(serializers.Serializer):
    scenario = serializers.PrimaryKeyRelatedField(queryset=Scenario.objects.none())

    def get_fields(self):
        fields = super().get_fields()

        request = self.context.get("request")
        if request:
            account = request.user.iaso_profile.account
            fields["scenario"].queryset = Scenario.objects.filter(account=account)
        return fields


class ScenarioYearlyCostAssignmentUpsertSerializer(serializers.Serializer):
    intervention = serializers.PrimaryKeyRelatedField(
        queryset=InterventionCostBreakdownLine.objects.none(), required=True
    )
    scenario = serializers.PrimaryKeyRelatedField(queryset=Scenario.objects.none(), required=True)
    cost_line = serializers.PrimaryKeyRelatedField(
        queryset=InterventionCostBreakdownLine.objects.none(), required=False
    )
    year = serializers.IntegerField(max_value=2100, min_value=2000, required=True)
    value = serializers.DecimalField(max_digits=19, decimal_places=2, required=True)

    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get("request")
        if request:
            account = request.user.iaso_profile.account

            fields["intervention"].queryset = Intervention.objects.select_related("intervention_category").filter(
                intervention_category__account=account
            )
            fields["scenario"].queryset = Scenario.objects.select_related("account").filter(account=account)
            fields["cost_line"].queryset = InterventionCostBreakdownLine.objects.select_related(
                "intervention__intervention_category"
            ).filter(intervention__intervention_category__account=account)
        return fields

    def validate(self, attrs):
        intervention = attrs["intervention"]
        if not intervention.cost_breakdown_lines.exists():
            raise serializers.ValidationError(f"Intervention {intervention.id} does not have any cost breakdown line.")
        return attrs

    def validate_scenario(self, value):
        if value.is_locked:
            raise serializers.ValidationError("Cannot assign yearly cost to a locked scenario.")
        return value

    # Save info, if cost_line is provided, update or create the assignment for this cost line
    # if not provided update or create the assignment for all population cost lines of the intervention
    def save(self, **kwargs):
        intervention = self.validated_data["intervention"]
        year = self.validated_data["year"]
        value = self.validated_data["value"]

        if not self.validated_data.get("cost_line"):
            cost_lines = intervention.cost_breakdown_lines.filter(
                cost_driver=InterventionCostBreakdownLine.CostDriver.POPULATION
            )
        else:
            cost_lines = [self.validated_data["cost_line"]]

        scenario = self.validated_data["scenario"]
        assignments = []
        for cost_line in cost_lines:
            assignment, _ = ScenarioYearlyCostAssignment.objects.update_or_create(
                scenario=scenario,
                cost_line=cost_line,
                year=year,
                defaults={"value": value},
            )
            assignments.append(assignment)

        return assignments
