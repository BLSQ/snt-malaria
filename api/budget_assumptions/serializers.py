from rest_framework import serializers

from plugins.snt_malaria.models.budget_assumptions import BudgetAssumptions
from plugins.snt_malaria.models.scenario import Scenario


class BudgetAssumptionsQuerySerializer(serializers.Serializer):
    scenario = serializers.PrimaryKeyRelatedField(queryset=Scenario.objects.all())


class BudgetAssumptionsSerializer(serializers.ModelSerializer):
    class Meta:
        model = BudgetAssumptions
        fields = (
            "id",
            "scenario",
            "intervention_code",
            "coverage",
            "divisor",
            "bale_size",
            "buffer_mult",
            "doses_per_pw",
            "age_string",
            "pop_prop_3_11",
            "pop_prop_12_59",
            "monthly_rounds",
            "touchpoints",
            "tablet_factor",
            "doses_per_child",
        )


class BudgetAssumptionsWriteSerializer(serializers.ModelSerializer):
    scenario = serializers.PrimaryKeyRelatedField(queryset=Scenario.objects.all())
    intervention_code = serializers.CharField(max_length=100)

    divisor = serializers.DecimalField(min_value=0, max_value=9, max_digits=3, decimal_places=2)
    bale_size = serializers.IntegerField(min_value=0, max_value=999)
    buffer_mult = serializers.DecimalField(min_value=0, max_value=9, max_digits=3, decimal_places=2)
    coverage = serializers.DecimalField(min_value=0, max_value=1, max_digits=3, decimal_places=2)
    doses_per_pw = serializers.IntegerField(min_value=0, max_value=999)
    age_string = serializers.CharField()
    pop_prop_3_11 = serializers.DecimalField(max_digits=3, decimal_places=2)
    pop_prop_12_59 = serializers.DecimalField(max_digits=3, decimal_places=2)
    monthly_rounds = serializers.IntegerField(min_value=0, max_value=31)
    touchpoints = serializers.IntegerField(min_value=0, max_value=999)
    tablet_factor = serializers.DecimalField(min_value=0, max_value=1, max_digits=3, decimal_places=2)
    doses_per_child = serializers.IntegerField(min_value=0, max_value=999)

    class Meta:
        model = BudgetAssumptions
        fields = (
            "id",
            "scenario",
            "intervention_code",
            "coverage",
            "divisor",
            "bale_size",
            "buffer_mult",
            "doses_per_pw",
            "age_string",
            "pop_prop_3_11",
            "pop_prop_12_59",
            "monthly_rounds",
            "touchpoints",
            "tablet_factor",
            "doses_per_child",
        )

    def validate(self, attrs):
        scenario = attrs.get("scenario")
        if scenario.is_locked:
            raise serializers.ValidationError(
                {"scenario_id": "Cannot modify budget assumptions for a locked scenario."}
            )
        return attrs
