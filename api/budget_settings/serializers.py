from rest_framework import serializers

from plugins.snt_malaria.models.budget_settings import BudgetSettings


class BudgetSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = BudgetSettings
        fields = ["id", "local_currency", "exchange_rate", "inflation_rate"]
