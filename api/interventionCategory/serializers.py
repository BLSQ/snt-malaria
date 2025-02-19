from rest_framework import serializers
from plugins.snt_malaria.models import InterventionCategory
from plugins.snt_malaria.api.intervention.serializers import InterventionSerializer


class InterventionCategorySerializer(serializers.ModelSerializer):
    interventions = InterventionSerializer(many=True, source="intervention_set")

    class Meta:
        model = InterventionCategory
        fields = [
            "id",
            "account",
            "name",
            "description",
            "interventions",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["interventions", "created_at", "updated_at"]
