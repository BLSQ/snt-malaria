from rest_framework import serializers

from iaso.models.metric import MetricType
from iaso.utils.org_units import get_valid_org_units_with_geography
from plugins.snt_malaria.models.intervention import Intervention
from plugins.snt_malaria.models.scenario import Scenario


class MatchingCriterionSerializer(serializers.Serializer):
    metricType = serializers.IntegerField()
    operator = serializers.ChoiceField(choices=["<", "<=", ">", ">="])
    value = serializers.FloatField(required=False, allow_null=True)
    string_value = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        if data.get("value") is None and not data.get("string_value"):
            raise serializers.ValidationError("Either 'value' or 'string_value' must be provided.")
        return data


class WriteScenarioRuleSerializer(serializers.Serializer):
    priority = serializers.CharField()
    name = serializers.CharField()
    color = serializers.CharField()
    matching_criterion = MatchingCriterionSerializer(many=True)
    scenario = serializers.PrimaryKeyRelatedField(queryset=Scenario.objects.none(), allow_null=False)
    # TODO prefilter this on scenario ?
    interventions = serializers.PrimaryKeyRelatedField(queryset=Intervention.objects.all(), many=True, allow_null=True)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user and user.is_authenticated:
            account = user.iaso_profile.account
            self.fields["scenario"].queryset = Scenario.objects.filter(account=account)

    def validate(self, data):
        # Additional validation logic can be added here
        return data

    def to_jsonlogic(self):
        criteria = self.validated_data["matching_criterion"]
        logic = {"and": []}
        for c in criteria:
            var = f"metric_{c['metricType']}"
            op = c["operator"]
            if c.get("value") is not None:
                logic["and"].append({op: [{"var": var}, c["value"]]})
            elif c.get("string_value"):
                logic["and"].append({"==": [{"var": var}, c["string_value"]]})
        return logic
