from rest_framework import serializers

from plugins.snt_malaria.models import CostBreakdownLine, CostBreakdownLineCategory, Intervention


class CostBreakdownLineSerializer(serializers.ModelSerializer):
    category = serializers.PrimaryKeyRelatedField(queryset=CostBreakdownLineCategory.objects.all(), required=True)

    class Meta:
        model = CostBreakdownLine
        fields = ["id", "name", "cost", "category"]

    def validate_category(self, category):
        if not category:
            raise serializers.ValidationError(f"Invalid category {category.id}")
        if category.account != self.context["request"].user.iaso_profile.account:
            raise serializers.ValidationError(f"Category {category.id} does not belong to your account.")
        return category


class CostBreakdownLinesWriteSerializer(serializers.ModelSerializer):
    intervention = serializers.PrimaryKeyRelatedField(queryset=Intervention.objects.all(), required=True)
    costs = CostBreakdownLineSerializer(many=True)

    class Meta:
        model = CostBreakdownLine
        fields = ["intervention", "costs"]

    def validate_intervention(self, intervention):
        if not intervention:
            raise serializers.ValidationError("Invalid intervention ID.")
        return intervention
