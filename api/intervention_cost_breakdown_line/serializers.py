from django.db import transaction
from rest_framework import serializers

from iaso.models.metric import MetricType
from plugins.snt_malaria.models import Intervention, InterventionCostBreakdownLine
from plugins.snt_malaria.models.cost_unit_type import CostUnitType


class InterventionCostBreakdownLineWriteListSerializer(serializers.ListSerializer):
    def update(self, queryset, validated_data):
        request = self.context.get("request")
        request_user = request.user if request else None

        existing_lines = {line.id: line for line in queryset}
        lines_to_update = []
        lines_to_create = []
        lines_to_delete = set(existing_lines.keys())
        for item in validated_data:
            line_id = item.get("id")
            if line_id and line_id in existing_lines:
                line = existing_lines[line_id]
                for attr, value in item.items():
                    setattr(line, attr, value)
                lines_to_update.append(line)
                lines_to_delete.discard(line_id)
            else:
                item.pop("id", None)  # Ensure ID is not set for new instances
                lines_to_create.append(
                    InterventionCostBreakdownLine(
                        created_by=request_user,
                        updated_by=request_user,
                        **item,
                    )
                )
        with transaction.atomic():
            if lines_to_update:
                InterventionCostBreakdownLine.objects.bulk_update(
                    lines_to_update,
                    fields=["name", "unit_cost", "unit_type", "category", "intervention", "updated_by"],
                )
            if lines_to_delete:
                InterventionCostBreakdownLine.objects.filter(id__in=lines_to_delete).delete()
            if lines_to_create:
                InterventionCostBreakdownLine.objects.bulk_create(lines_to_create)

        return queryset.filter(id__in=[line.id for line in lines_to_update] + [line.id for line in lines_to_create])


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
            "population_layer",
        ]

    def get_unit_type_label(self, obj):
        return obj.unit_type.name

    def get_category_label(self, obj):
        return InterventionCostBreakdownLine.InterventionCostBreakdownLineCategory(obj.category).label


class InterventionCostBreakdownLineWriteSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)
    name = serializers.CharField(required=True)
    unit_cost = serializers.DecimalField(max_digits=19, decimal_places=2, required=True, min_value=0)
    category = serializers.ChoiceField(
        choices=InterventionCostBreakdownLine.InterventionCostBreakdownLineCategory.choices,
        required=True,
    )
    intervention = serializers.PrimaryKeyRelatedField(
        queryset=Intervention.objects.none(),
    )
    unit_type = serializers.PrimaryKeyRelatedField(
        queryset=CostUnitType.objects.none(), required=True, allow_null=False
    )
    population_layer = serializers.PrimaryKeyRelatedField(
        queryset=MetricType.objects.none(), required=False, allow_null=True
    )

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
            "population_layer",
        ]

    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get("request")
        if request:
            account = request.user.iaso_profile.account
            fields["unit_type"].queryset = CostUnitType.objects.filter(account=account)
            fields["intervention"].queryset = Intervention.objects.filter(
                intervention_category__account=account,
            )
            fields["population_layer"].queryset = MetricType.objects.filter(account=account)
        return fields