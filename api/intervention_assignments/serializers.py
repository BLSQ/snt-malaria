from rest_framework import exceptions, serializers

from iaso.models.org_unit import OrgUnit
from iaso.utils.org_units import get_valid_org_units_with_geography
from plugins.snt_malaria.api.interventions.serializers import InterventionSerializer
from plugins.snt_malaria.models import InterventionAssignment, Scenario
from plugins.snt_malaria.models.intervention import Intervention
from plugins.snt_malaria.permissions import SNT_SCENARIO_FULL_WRITE_PERMISSION


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
            "scenario_id",
        ]
        read_only_fields = fields


class InterventionAssignmentWriteSerializer(serializers.ModelSerializer):
    """For creating InterventionAssignment"""

    scenario_id = serializers.IntegerField(write_only=True)
    orgunit_interventions = serializers.DictField(
        child=serializers.ListField(child=serializers.IntegerField()), write_only=True
    )

    class Meta:
        model = InterventionAssignment
        fields = ["orgunit_interventions", "scenario_id"]

    def validate(self, attrs):
        request = self.context.get("request")
        account = request.user.iaso_profile.account
        scenario_id = attrs.get("scenario_id")
        orgunit_interventions = attrs.get("orgunit_interventions", {})
        org_unit_ids = [int(k) for k in orgunit_interventions.keys()]
        intervention_ids = list({intervention_id for ids in orgunit_interventions.values() for intervention_id in ids})

        # Check the existence of scenario
        try:
            scenario = Scenario.objects.get(
                account=account,
                id=scenario_id,
            )
        except Scenario.DoesNotExist:
            raise serializers.ValidationError({"scenario_id": "Invalid scenario ID."})

        # Check that scenario is not locked
        if scenario.is_locked:
            raise serializers.ValidationError({"scenario_id": "The scenario is locked and cannot be modified."})

        if scenario.created_by != request.user and not request.user.has_perm(
            SNT_SCENARIO_FULL_WRITE_PERMISSION.full_name()
        ):
            raise exceptions.PermissionDenied()

        # Check the existence of selected orgUnits
        valid_org_units = get_valid_org_units_with_geography(account).filter(id__in=org_unit_ids)
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

        valid_orgunit_interventions = []
        org_units_dict = {ou.id: ou for ou in valid_org_units}
        interventions_dict = {i.id: i for i in valid_interventions}

        for org_unit_id, intervention_ids in orgunit_interventions.items():
            org_unit = org_units_dict.get(int(org_unit_id))
            interventions = [interventions_dict[iid] for iid in intervention_ids if iid in interventions_dict]
            if org_unit and interventions:
                valid_orgunit_interventions.append(
                    {
                        "org_unit": org_unit,
                        "interventions": interventions,
                    }
                )
        attrs["scenario"] = scenario
        attrs["valid_org_units"] = valid_org_units
        attrs["valid_interventions"] = valid_interventions
        attrs["orgunit_interventions"] = orgunit_interventions
        attrs["valid_orgunit_interventions"] = valid_orgunit_interventions
        return attrs
