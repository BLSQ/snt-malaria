from rest_framework import serializers
from plugins.snt_malaria.models import InterventionFamily, Intervention


class InterventionSerializer(serializers.ModelSerializer):

    class Meta:
        model = Intervention
        fields = [
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


class InterventionFamilySerializer(serializers.ModelSerializer):
    interventions = InterventionSerializer(many=True, source="intervention_set")

    class Meta:
        model = InterventionFamily
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
