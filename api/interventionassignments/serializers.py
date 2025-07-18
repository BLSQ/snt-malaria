from rest_framework import serializers

from iaso.models.org_unit import OrgUnit
from plugins.snt_malaria.api.interventions.serializers import InterventionSerializer
from plugins.snt_malaria.models import InterventionAssignment, Scenario
from plugins.snt_malaria.models.intervention import Intervention


class InterventionAssignmentToOrgUnitSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source="org_unit.id")
    name = serializers.CharField(source="org_unit.name")
    intervention_assignment_id = serializers.IntegerField(source="id")

    class Meta:
        model = InterventionAssignment
        fields = ["id", "name", "intervention_assignment_id"]


class OrgUnitSmallSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrgUnit
        fields = ["id", "name"]


class InterventionAssignmentListSerializer(serializers.ModelSerializer):
    """For reading InterventionAssignment"""

    intervention = InterventionSerializer(read_only=True)
    org_unit = OrgUnitSmallSerializer(read_only=True)

    class Meta:
        model = InterventionAssignment
        fields = [
            "id",
            "intervention",
            "org_unit",
            "created_at",
            "updated_at",
            "scenario_id",
        ]
        read_only_fields = fields


class InterventionAssignmentWriteSerializer(serializers.ModelSerializer):
    """For creating InterventionAssignment"""

    org_unit_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True)
    intervention_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True)
    scenario_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = InterventionAssignment
        fields = ["org_unit_ids", "intervention_ids", "scenario_id"]

    def validate(self, attrs):
        request = self.context.get("request")
        account = request.user.iaso_profile.account
        scenario_id = attrs.get("scenario_id")
        org_unit_ids = attrs.get("org_unit_ids", [])
        intervention_ids = attrs.get("intervention_ids")

        # Check the existence of scenario
        try:
            scenario = Scenario.objects.get(
                account=account,
                id=scenario_id,
            )
        except Scenario.DoesNotExist:
            raise serializers.ValidationError({"scenario_id": "Invalid scenario ID."})

        # Check the existence of selected orgUnits
        valid_org_units = OrgUnit.objects.filter(id__in=org_unit_ids)
        missing_org_units = set(org_unit_ids) - set(valid_org_units.values_list("id", flat=True))
        if missing_org_units:
            raise serializers.ValidationError({"org_unit_ids": f"Invalid org_unit IDs: {missing_org_units}"})

        # Check the existence of selected interventions
        valid_interventions = Intervention.objects.filter(
            intervention_category__account=account,
            id__in=intervention_ids,
        )
        missing_interventions = set(intervention_ids) - set(valid_interventions.values_list("id", flat=True))
        if missing_interventions:
            raise serializers.ValidationError(
                {"intervention_ids": f"Invalid intervention IDs: {missing_interventions}"}
            )
        attrs["scenario"] = scenario
        attrs["valid_org_units"] = valid_org_units
        attrs["valid_interventions"] = valid_interventions
        return attrs
