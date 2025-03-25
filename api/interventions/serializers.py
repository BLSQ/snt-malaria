from rest_framework import serializers

from plugins.snt_malaria.models import Intervention


class InterventionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Intervention
        fields = [
            "id",
            "name",
            "description",
            "cost_per_unit",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "created_at",
            "updated_at",
        ]
