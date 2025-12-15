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
    scenario = serializers.PrimaryKeyRelatedField(queryset=Scenario.objects.all())
    intervention = serializers.PrimaryKeyRelatedField(queryset=Intervention.objects.all())

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
    tablet_factor = serializers.IntegerField(min_value=0, max_value=999)
    doses_per_child = serializers.IntegerField(min_value=0, max_value=999)

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
