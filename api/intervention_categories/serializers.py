from rest_framework import serializers

from plugins.snt_malaria.api.interventions.serializers import InterventionSerializer
from plugins.snt_malaria.models import InterventionCategory


class InterventionCategorySerializer(serializers.ModelSerializer):
    interventions = InterventionSerializer(many=True, source="intervention_set", read_only=True)

    class Meta:
        model = InterventionCategory
        fields = [
            "id",
            "name",
            "short_name",
            "description",
            "interventions",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "interventions",
            "created_by",
            "created_at",
            "updated_at",
        ]
