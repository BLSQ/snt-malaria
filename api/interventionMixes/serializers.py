from rest_framework import serializers

from iaso.models.org_unit import OrgUnit
from plugins.snt_malaria.api.interventions.serializers import InterventionSerializer
from plugins.snt_malaria.models.intervention import Intervention, InterventionMix


class InterventionMixSerializer(serializers.ModelSerializer):
    interventions = InterventionSerializer(many=True)
    intervention_ids = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Intervention.objects.all(), write_only=True
    )

    class Meta:
        model = InterventionMix
        fields = ["id", "name", "account", "interventions", "intervention_ids"]
        read_only_fields = ["id", "account", "interventions"]

    def update(self, instance, validated_data):
        interventions = validated_data.pop("intervention_ids", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if interventions is not None:
            instance.interventions.set(interventions)

        return instance


class OrgUnitSmallSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrgUnit
        fields = ["id", "name"]
