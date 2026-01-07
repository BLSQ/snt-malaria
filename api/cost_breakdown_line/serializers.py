from rest_framework import serializers

from iaso.api.common import DropdownOptionsSerializer
from plugins.snt_malaria.models import Intervention, InterventionCostBreakdownLine, InterventionCostUnitType


class InterventionCostBreakdownLineSerializer(serializers.ModelSerializer):
    category = serializers.ChoiceField(
        choices=InterventionCostBreakdownLine.InterventionCostBreakdownLineCategory.choices,
        required=True,
    )

    unit_cost = serializers.DecimalField(max_digits=19, decimal_places=2, required=True, min_value=0)
    unit_type_label = serializers.SerializerMethodField()
    category_label = serializers.SerializerMethodField()

    class Meta:
        model = InterventionCostBreakdownLine
        fields = [
            "id",
            "name",
            "unit_cost",
            "unit_type",
            "unit_type_label",
            "category",
            "category_label",
            "year",
            "intervention",
        ]

    def get_unit_type_label(self, obj):
        choices = dict(InterventionCostUnitType.choices)
        return choices.get(obj.unit_type, obj.unit_type)

    def get_category_label(self, obj):
        choices = dict(InterventionCostBreakdownLine.InterventionCostBreakdownLineCategory.choices)
        return choices.get(obj.category, obj.category)


class InterventionCostBreakdownLinesWriteSerializer(serializers.ModelSerializer):
    intervention = serializers.PrimaryKeyRelatedField(queryset=Intervention.objects.all(), required=True)
    costs = InterventionCostBreakdownLineSerializer(many=True)
    year = serializers.IntegerField(required=True)

    class Meta:
        model = InterventionCostBreakdownLine
        fields = ["intervention", "year", "costs"]


class DropdownOptionsWithRepresentationSerializer(DropdownOptionsSerializer):
    def to_representation(self, instance):
        return {"value": instance[0], "label": str(instance[1])}
