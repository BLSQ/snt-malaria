from rest_framework import serializers

from plugins.snt_malaria.api.interventions.serializers import InterventionSerializer
from plugins.snt_malaria.models.intervention import InterventionMix


class InterventionMixSerializer(serializers.ModelSerializer):
    interventions = InterventionSerializer(many=True)

    class Meta:
        model = InterventionMix
        fields = ["id", "name", "account", "interventions"]
        read_only_fields = ["id", "account", "interventions"]
