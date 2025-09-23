from rest_framework import serializers

from plugins.snt_malaria.models import Intervention


class InterventionSerializer(serializers.ModelSerializer):
    unit_cost = serializers.DecimalField(max_digits=19, decimal_places=2, required=True, min_value=0)

    class Meta:
        model = Intervention
        fields = [
            "id",
            "name",
            "description",
            "unit_cost",
            "unit_type",
            "intervention_category",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]
