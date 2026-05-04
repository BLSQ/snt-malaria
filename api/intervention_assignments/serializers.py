from rest_framework import serializers

from iaso.models.org_unit import OrgUnit
from plugins.snt_malaria.api.interventions.serializers import InterventionSerializer
from plugins.snt_malaria.api.scenario_rules.serializers import ScenarioRuleSmallSerializer
from plugins.snt_malaria.models import InterventionAssignment


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
    rule = ScenarioRuleSmallSerializer(read_only=True)
    org_unit = OrgUnitSmallSerializer(read_only=True)

    class Meta:
        model = InterventionAssignment
        fields = [
            "id",
            "rule",
            "intervention",
            "org_unit",
            "created_at",
            "scenario_id",
        ]
        read_only_fields = fields
