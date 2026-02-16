from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied

from plugins.snt_malaria.models.budget_assumptions import BudgetAssumptions
from plugins.snt_malaria.models.scenario import Scenario
from plugins.snt_malaria.permissions import SNT_SCENARIO_FULL_WRITE_PERMISSION


class BudgetAssumptionsQuerySerializer(serializers.Serializer):
    scenario = serializers.PrimaryKeyRelatedField(queryset=Scenario.objects.none())

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        user = self.context["request"].user
        account = user.iaso_profile.account
        self.fields["scenario"].queryset = Scenario.objects.filter(account=account)


class BudgetAssumptionsReadSerializer(serializers.ModelSerializer):
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


class BudgetAssumptionsUpdateSerializer(serializers.ModelSerializer):
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
        fields = [
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
        ]


class BudgetAssumptionsCreateSerializer(BudgetAssumptionsUpdateSerializer):
    scenario = serializers.PrimaryKeyRelatedField(queryset=Scenario.objects.none())
    intervention_code = serializers.CharField(max_length=100)

    class Meta:
        model = BudgetAssumptions
        fields = [
            *BudgetAssumptionsUpdateSerializer.Meta.fields,
            "id",
            "scenario",
            "intervention_code",
        ]
        read_only_fields = ["id"]  # id is added so that frontend receives it after creation

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        user = self.context["request"].user
        account = user.iaso_profile.account
        self.fields["scenario"].queryset = Scenario.objects.filter(account=account)

    def validate_scenario(self, value):
        user = self.context["request"].user
        if value.created_by != user and not user.has_perm(SNT_SCENARIO_FULL_WRITE_PERMISSION.full_name()):
            raise PermissionDenied("User does not have permission to modify assumptions for this scenario")
        return value
