from rest_framework import serializers

from plugins.snt_malaria.models import Intervention


class InterventionSerializer(serializers.ModelSerializer):
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
        ]
        read_only_fields = [
            "id",
            "created_at",
        ]
