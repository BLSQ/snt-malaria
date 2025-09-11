from rest_framework import serializers

from plugins.snt_malaria.models import InterventionCostCategory


class InterventionCostCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = InterventionCostCategory
        fields = [
            "id",
            "name",
        ]
        read_only_fields = ["id", "name"]
