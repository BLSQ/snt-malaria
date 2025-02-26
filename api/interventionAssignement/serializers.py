from iaso.models.org_unit import OrgUnit
from plugins.snt_malaria.api.intervention.serializers import InterventionSerializer
from plugins.snt_malaria.models.intervention import Intervention
from rest_framework import serializers
from plugins.snt_malaria.models import InterventionAssignment, Scenario


class InterventionAssignmentListSerializer(serializers.ModelSerializer):
    """For reading InterventionAssignment"""

    intervention = InterventionSerializer(read_only=True)

    class Meta:
        model = InterventionAssignment
        fields = [
            "id",
            "intervention",
            "org_unit_id",
            "created_at",
            "updated_at",
            "scenario_id",
        ]
        read_only_fields = fields


class InterventionAssignmentWriteSerializer(serializers.ModelSerializer):
    """For creating InterventionAssignment"""

    org_unit_ids = serializers.ListField(
        child=serializers.IntegerField(), write_only=True
    )
    intervention_ids = serializers.ListField(
        child=serializers.IntegerField(), write_only=True
    )
    scenario_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = InterventionAssignment
        fields = [
            "org_unit_ids",
            "intervention_ids",
            "scenario_id",
        ]

    def validate(self, attrs):
        scenario_id = attrs.get("scenario_id")
        org_unit_ids = attrs.get("org_unit_ids", [])
        intervention_ids = attrs.get("intervention_ids", [])

        # Check the existance of scenario
        try:
            scenario = Scenario.objects.get(id=scenario_id)
        except Scenario.DoesNotExist:
            raise serializers.ValidationError({"scenario_id": "Invalid scenario ID."})

        # Check the existance of selected orgUnits
        valid_org_units = OrgUnit.objects.filter(id__in=org_unit_ids)
        missing_org_units = set(org_unit_ids) - set(
            valid_org_units.values_list("id", flat=True)
        )
        if missing_org_units:
            raise serializers.ValidationError(
                {"org_unit_ids": f"Invalid org_unit IDs: {missing_org_units}"}
            )

        # Check the existance of selected interventions
        valid_interventions = Intervention.objects.filter(id__in=intervention_ids)
        missing_interventions = set(intervention_ids) - set(
            valid_interventions.values_list("id", flat=True)
        )
        if missing_interventions:
            raise serializers.ValidationError(
                {
                    "intervention_ids": f"Invalid intervention IDs: {missing_interventions}"
                }
            )

        attrs["scenario"] = scenario
        attrs["valid_org_units"] = valid_org_units
        attrs["valid_interventions"] = valid_interventions

        return attrs
