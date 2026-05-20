from rest_framework import serializers

from plugins.snt_malaria.models import Intervention, InterventionCostBreakdownLine
from plugins.snt_malaria.models.cost_unit_type import CostUnitType


class InterventionCostBreakdownLineWriteListSerializer(serializers.ListSerializer):
    def update(self, queryset, validated_data):
        request = self.context.get("request")
        request_user = request.user if request else None

        queryset.delete()

        lines = []
        for item in validated_data:
            lines.append(
                InterventionCostBreakdownLine(
                    created_by=request_user,
                    updated_by=request_user,
                    **item,
                )
            )

        return InterventionCostBreakdownLine.objects.bulk_create(lines)


class CostUnitTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = CostUnitType
        fields = ["id", "name", "ratio"]


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
            "intervention",
        ]

    def get_unit_type_label(self, obj):
        return obj.unit_type.name if obj.unit_type_id else None

    def get_category_label(self, obj):
        return InterventionCostBreakdownLine.InterventionCostBreakdownLineCategory(obj.category).label


class InterventionCostBreakdownLineWriteSerializer(serializers.ModelSerializer):
    name = serializers.CharField(required=True)
    unit_cost = serializers.DecimalField(max_digits=19, decimal_places=2, required=True, min_value=0)
    category = serializers.ChoiceField(
        choices=InterventionCostBreakdownLine.InterventionCostBreakdownLineCategory.choices,
        required=True,
    )
    intervention = serializers.PrimaryKeyRelatedField(
        queryset=Intervention.objects.all(),
    )
    unit_type = serializers.PrimaryKeyRelatedField(queryset=CostUnitType.objects.all(), required=False, allow_null=True)

    class Meta:
        model = InterventionCostBreakdownLine
        list_serializer_class = InterventionCostBreakdownLineWriteListSerializer
        fields = [
            "id",
            "name",
            "unit_cost",
            "unit_type",
            "category",
            "intervention",
        ]
