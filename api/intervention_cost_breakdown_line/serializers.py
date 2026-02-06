from rest_framework import serializers

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
        return InterventionCostUnitType(obj.unit_type).label

    def get_category_label(self, obj):
        return InterventionCostBreakdownLine.InterventionCostBreakdownLineCategory(obj.category).label


class CostsWriteSerializer(serializers.Serializer):
    name = serializers.CharField(required=True)
    unit_cost = serializers.DecimalField(max_digits=19, decimal_places=2, required=True, min_value=0)
    category = serializers.ChoiceField(
        choices=InterventionCostBreakdownLine.InterventionCostBreakdownLineCategory.choices,
        required=True,
    )
    unit_type = serializers.ChoiceField(
        choices=InterventionCostUnitType.choices,
        required=True,
    )


class InterventionCostBreakdownLinesWriteSerializer(serializers.ModelSerializer):
    intervention = serializers.PrimaryKeyRelatedField(queryset=Intervention.objects.all())
    costs = CostsWriteSerializer(many=True)
    year = serializers.IntegerField()

    class Meta:
        model = InterventionCostBreakdownLine
        fields = ["intervention", "year", "costs"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        user = self.context["request"].user
        account = user.iaso_profile.account
        self.fields["intervention"].queryset = Intervention.objects.filter(intervention_category__account=account)
