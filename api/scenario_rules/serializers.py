from rest_framework import serializers

from plugins.snt_malaria.models import Scenario, ScenarioRule
from plugins.snt_malaria.models.scenario import ScenarioRuleInterventionProperties


class ScenarioRuleInterventionPropertiesSerializer(serializers.ModelSerializer):
    category = serializers.IntegerField(read_only=True, source="intervention__intervention_category_id")
    coverage = serializers.DecimalField(max_digits=3, decimal_places=2)

    class Meta:
        model = ScenarioRuleInterventionProperties
        fields = [
            "intervention",
            "category",
            "coverage",
        ]


class ScenarioRuleQuerySerializer(serializers.Serializer):
    scenario = serializers.PrimaryKeyRelatedField(queryset=Scenario.objects.none())

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        user = self.context["request"].user
        account = user.iaso_profile.account
        self.fields["scenario"].queryset = Scenario.objects.filter(account=account)


class ScenarioRuleListSerializer(serializers.ModelSerializer):
    interventions = ScenarioRuleInterventionPropertiesSerializer(
        many=True, read_only=True, source="intervention_properties"
    )

    class Meta:
        model = ScenarioRule
        fields = [
            "id",
            "scenario",
            "name",
            "priority",
            "color",
            "interventions",
            "matching_criteria",
            "org_units_matched",
            "org_units_excluded",
            "org_units_included",
            "org_units_scope",
        ]


class ScenarioRuleRetrieveSerializer(serializers.ModelSerializer):
    interventions = ScenarioRuleInterventionPropertiesSerializer(
        many=True, read_only=True, source="intervention_properties"
    )

    class Meta:
        model = ScenarioRule
        fields = [
            "id",
            "scenario",
            "name",
            "priority",
            "color",
            "interventions",
            "matching_criteria",
            "org_units_matched",
            "org_units_excluded",
            "org_units_included",
            "org_units_scope",
            "created_by",
            "created_at",
            "updated_by",
            "updated_at",
        ]
