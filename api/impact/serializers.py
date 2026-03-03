from rest_framework import serializers

from plugins.snt_malaria.models import Scenario


# -- Request serializers -----------------------------------------------------


class ImpactQuerySerializer(serializers.Serializer):
    scenario_id = serializers.PrimaryKeyRelatedField(
        queryset=Scenario.objects.none(),
        source="scenario",
    )
    age_group = serializers.CharField()
    year_from = serializers.IntegerField(required=False, allow_null=True, default=None)
    year_to = serializers.IntegerField(required=False, allow_null=True, default=None)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        user = self.context["request"].user
        account = user.iaso_profile.account
        self.fields["scenario_id"].queryset = Scenario.objects.filter(account=account)

    def validate(self, attrs):
        year_from = attrs.get("year_from")
        year_to = attrs.get("year_to")
        if year_from is not None and year_to is not None and year_from > year_to:
            raise serializers.ValidationError({"year_from": "year_from must be less than or equal to year_to."})
        return attrs


# -- Response serializers ----------------------------------------------------


class MetricWithCISerializer(serializers.Serializer):
    value = serializers.FloatField(allow_null=True)
    lower = serializers.FloatField(allow_null=True)
    upper = serializers.FloatField(allow_null=True)


class ImpactMetricsSerializer(serializers.Serializer):
    number_cases = MetricWithCISerializer()
    number_severe_cases = MetricWithCISerializer()
    prevalence_rate = MetricWithCISerializer()
    averted_cases = MetricWithCISerializer()
    direct_deaths = MetricWithCISerializer()
    cost = serializers.FloatField(allow_null=True)
    cost_per_averted_case = MetricWithCISerializer()


class OrgUnitMetricsSerializer(ImpactMetricsSerializer):
    org_unit_id = serializers.IntegerField()
    org_unit_name = serializers.CharField()


class YearMetricsSerializer(ImpactMetricsSerializer):
    year = serializers.IntegerField()
    org_units = OrgUnitMetricsSerializer(many=True)


class ScenarioImpactSerializer(ImpactMetricsSerializer):
    scenario_id = serializers.IntegerField()
    by_year = YearMetricsSerializer(many=True)
    org_units = OrgUnitMetricsSerializer(many=True)
