from rest_framework import serializers

from plugins.snt_malaria.models import Scenario
from plugins.snt_malaria.providers.impact import get_provider_for_account


# -- Request serializers -----------------------------------------------------


class ImpactProviderSerializer(serializers.Serializer):
    """Base serializer that resolves the ImpactProvider from the request account."""

    def validate(self, attrs):
        account = self.context["request"].user.iaso_profile.account
        provider = get_provider_for_account(account)
        if provider is None:
            raise serializers.ValidationError("No impact data provider configured for this account.")
        attrs["provider"] = provider
        return attrs


class ImpactQuerySerializer(ImpactProviderSerializer):
    scenario_id = serializers.PrimaryKeyRelatedField(
        queryset=Scenario.objects.all(),
        source="scenario",
    )
    age_group = serializers.CharField()
    year_from = serializers.IntegerField(required=False, allow_null=True, default=None)
    year_to = serializers.IntegerField(required=False, allow_null=True, default=None)


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
