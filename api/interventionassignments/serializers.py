from rest_framework import serializers

from iaso.models.org_unit import OrgUnit
from plugins.snt_malaria.api.interventions.serializers import InterventionSerializer
from plugins.snt_malaria.models import InterventionAssignment, Scenario
from plugins.snt_malaria.models.intervention import Intervention, InterventionMix


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

    org_unit_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True)
    intervention_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True)
    scenario_id = serializers.IntegerField(write_only=True)
    mix_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    selectedMix = serializers.IntegerField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = InterventionAssignment
        fields = ["mix_name", "org_unit_ids", "intervention_ids", "scenario_id", "selectedMix"]

    def validate(self, attrs):
        request = self.context.get("request")
        account = request.user.iaso_profile.account
        mix_name = attrs.get("mix_name", "").strip()
        scenario_id = attrs.get("scenario_id")
        org_unit_ids = attrs.get("org_unit_ids", [])
        intervention_ids = attrs.get("intervention_ids", [])
        selected_mix_id = attrs.get("selectedMix")
        selected_mix = None

        # check if mix name or selected mix is available
        if not mix_name and not selected_mix_id:
            raise serializers.ValidationError("Either 'mix_name' or 'selected_mix' must be provided.")
        # check the existence of the selected Mix
        if selected_mix_id:
            try:
                selected_mix = InterventionMix.objects.get(id=selected_mix_id, account=account, scenario=scenario_id)
            except Scenario.DoesNotExist:
                raise serializers.ValidationError({"selectedMix": "Invalid selected mix."})

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
        attrs["mix_name"] = mix_name
        attrs["scenario"] = scenario
        attrs["valid_org_units"] = valid_org_units
        attrs["valid_interventions"] = valid_interventions
        attrs["selected_mix"] = selected_mix
        return attrs
