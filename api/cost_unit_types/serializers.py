from rest_framework import serializers

from plugins.snt_malaria.models.cost_unit_type import CostUnitType


class CostUnitTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = CostUnitType
        fields = ["id", "name", "description"]
        read_only_fields = ["id"]
