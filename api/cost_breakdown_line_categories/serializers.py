from rest_framework import serializers

from plugins.snt_malaria.models import CostBreakdownLineCategory


class CostBreakdownLineCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = CostBreakdownLineCategory
        fields = [
            "id",
            "name",
        ]
        read_only_fields = ["id", "name"]
