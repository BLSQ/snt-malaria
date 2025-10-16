from rest_framework import serializers

from plugins.snt_malaria.models.budget import Budget


class BudgetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Budget
        fields = ["id", "name", "scenario", "cost_input", "assumption", "result", "updated_at"]
