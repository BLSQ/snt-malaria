from rest_framework import serializers

from iaso.api.common import DropdownOptionsSerializer
from plugins.snt_malaria.models import Intervention


class InterventionUnitTypeSerializer(DropdownOptionsSerializer):
    def to_representation(self, instance):
        return {"value": instance[0], "label": str(instance[1])}


class InterventionSerializer(serializers.ModelSerializer):
    unit_cost = serializers.DecimalField(max_digits=19, decimal_places=2, required=True, min_value=0)
    unit_type_label = serializers.SerializerMethodField()

    class Meta:
        model = Intervention
        fields = [
            "id",
            "name",
            "description",
            "unit_cost",
            "unit_type",
            "unit_type_label",
            "intervention_category",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "unit_type_label",
        ]

    def get_unit_type_label(self, obj):
        choices = dict(Intervention.InterventionUnitType.choices)
        return choices.get(obj.unit_type, obj.unit_type)
