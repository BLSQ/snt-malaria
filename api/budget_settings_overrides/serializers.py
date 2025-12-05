from rest_framework import serializers

from plugins.snt_malaria.models.budget_settings_overrides import BudgetSettingsOverrides


class BudgetSettingsOverridesListSerializer(serializers.ModelSerializer):
    class Meta:
        model = BudgetSettingsOverrides
        fields = "__all__"
