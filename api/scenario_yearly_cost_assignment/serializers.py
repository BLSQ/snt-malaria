from rest_framework import serializers

from plugins.snt_malaria.models import InterventionCostBreakdownLine, Scenario, ScenarioYearlyCostAssignment


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

    def to_representation(self, instance):
        data = super().to_representation(instance)
        value = float(instance.value)
        if instance.cost_line.cost_driver == InterventionCostBreakdownLine.CostDriver.POPULATION:
            value *= 100

        data["value"] = f"{round(value)}"

        return data


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
    scenario = serializers.PrimaryKeyRelatedField(queryset=Scenario.objects.none(), required=True)
    cost_line = serializers.PrimaryKeyRelatedField(queryset=InterventionCostBreakdownLine.objects.none(), required=True)
    year = serializers.IntegerField(max_value=2100, min_value=2000, required=True)
    value = serializers.DecimalField(max_digits=19, decimal_places=2, required=True)

    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get("request")
        if request:
            account = request.user.iaso_profile.account

            fields["scenario"].queryset = Scenario.objects.select_related("account").filter(account=account)
            fields["cost_line"].queryset = InterventionCostBreakdownLine.objects.select_related(
                "intervention__intervention_category"
            ).filter(intervention__intervention_category__account=account)
        return fields

    def validate_scenario(self, value):
        if value.is_locked:
            raise serializers.ValidationError("Cannot assign yearly cost to a locked scenario.")
        return value

    def save(self, **kwargs):
        year = self.validated_data.get("year", self.instance.year if self.instance else None)
        cost_line = self.validated_data.get("cost_line", self.instance.cost_line if self.instance else None)
        scenario = self.validated_data.get("scenario", self.instance.scenario if self.instance else None)

        defaults = {}
        if "value" in self.validated_data:
            value = self.validated_data["value"]
            defaults["value"] = (
                value / 100 if cost_line.cost_driver == InterventionCostBreakdownLine.CostDriver.POPULATION else value
            )

        self.instance, _ = ScenarioYearlyCostAssignment.objects.update_or_create(
            scenario=scenario,
            cost_line=cost_line,
            year=year,
            defaults=defaults,
        )

        return self.instance
