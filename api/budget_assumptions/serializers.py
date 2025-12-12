from rest_framework import serializers

from plugins.snt_malaria.models.budget_assumptions import BudgetAssumptions
from plugins.snt_malaria.models.intervention import Intervention
from plugins.snt_malaria.models.scenario import Scenario


class BudgetAssumptionsQuerySerializer(serializers.Serializer):
    scenario = serializers.PrimaryKeyRelatedField(queryset=Scenario.objects.all(), required=True)


class BudgetAssumptionsSerializer(serializers.ModelSerializer):
    class Meta:
        model = BudgetAssumptions
        fields = (
            "id",
            "scenario",
            "intervention",
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
    scenario = serializers.PrimaryKeyRelatedField(queryset=Scenario.objects.all(), required=True)
    intervention = serializers.PrimaryKeyRelatedField(queryset=Intervention.objects.all(), required=True)

    class Meta:
        model = BudgetAssumptions
        fields = (
            "id",
            "scenario",
            "intervention",
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
