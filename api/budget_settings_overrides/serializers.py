from rest_framework import serializers

from plugins.snt_malaria.models.budget_settings_overrides import BudgetSettingsOverrides
from plugins.snt_malaria.models.intervention import Intervention
from plugins.snt_malaria.models.scenario import Scenario


class BudgetSettingsOverridesListSerializer(serializers.ModelSerializer):
    scenario = serializers.PrimaryKeyRelatedField(queryset=Scenario.objects.all(), required=True)
    intervention = serializers.PrimaryKeyRelatedField(queryset=Intervention.objects.all(), required=True)

    class Meta:
        model = BudgetSettingsOverrides
        fields = "__all__"


class BudgetSettingsOverridesWriteSerializer(serializers.ModelSerializer):
    scenario = serializers.PrimaryKeyRelatedField(queryset=Scenario.objects.all(), required=True)
    intervention = serializers.PrimaryKeyRelatedField(queryset=Intervention.objects.all(), required=True)

    class Meta:
        model = BudgetSettingsOverrides
        fields = "__all__"
