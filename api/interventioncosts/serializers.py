from rest_framework import serializers

from plugins.snt_malaria.models import Intervention, InterventionCost, InterventionCostCategory


class InterventionCostSerializer(serializers.ModelSerializer):
    class Meta:
        model = InterventionCost
        fields = ["id", "name", "cost", "category_id"]
        read_only_fields = fields


class InterventionCostWriteSerializer(serializers.ModelSerializer):
    intervention_id = serializers.IntegerField(write_only=True)
    costs = serializers.ListField(child=serializers.DictField())

    class Meta:
        model = InterventionCost
        fields = ["intervention_id", "costs"]

    def validate(self, attrs):
        super().validate(attrs)
        request = self.context.get("request")
        account = request.user.iaso_profile.account
        intervention_id = attrs.get("intervention_id")
        costs = attrs.get("costs", [])
        # Check the existence of intervention
        try:
            intervention = Intervention.objects.get(
                id=intervention_id,
            )
        except Intervention.DoesNotExist:
            raise serializers.ValidationError({"intervention_id": "Invalid intervention ID."})

        cost_categories = InterventionCostCategory.objects.filter(account=account)
        cost_category_ids = set(cost_categories.values_list("id", flat=True))
        for cost in costs:
            if cost["category_id"] not in cost_category_ids:
                raise serializers.ValidationError(
                    {"category_id": f"Invalid category_id {cost['category_id']} for cost {cost['name']}"}
                )

        # Validate costs

        attrs["intervention"] = intervention
        attrs["cost_categories"] = cost_categories
        return attrs
