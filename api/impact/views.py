from rest_framework import viewsets
from rest_framework.exceptions import NotFound
from rest_framework.response import Response

from plugins.snt_malaria.providers.impact import get_provider_for_account
from plugins.snt_malaria.services.impact import ImpactService

from .serializers import ImpactQuerySerializer, ScenarioImpactSerializer


def _get_provider(request):
    """Resolve the ImpactProvider for the requesting user's account."""
    account = request.user.iaso_profile.account
    provider = get_provider_for_account(account)
    if provider is None:
        raise NotFound("No impact data provider configured for this account.")
    return provider


class ImpactYearRangeViewSet(viewsets.ViewSet):
    http_method_names = ["get", "options"]

    def list(self, request):
        provider = _get_provider(request)
        min_year, max_year = provider.get_year_range()
        return Response({"min_year": min_year, "max_year": max_year})


class ImpactAgeGroupsViewSet(viewsets.ViewSet):
    http_method_names = ["get", "options"]

    def list(self, request):
        provider = _get_provider(request)
        age_groups = provider.get_age_groups()
        return Response({"age_groups": age_groups})


class ImpactViewSet(viewsets.ViewSet):
    http_method_names = ["get", "options"]

    def list(self, request):
        provider = _get_provider(request)

        serializer = ImpactQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        service = ImpactService(provider)
        result = service.get_scenario_impact(
            scenario=data["scenario"],
            age_group=data["age_group"],
            year_from=data["year_from"],
            year_to=data["year_to"],
        )
        return Response(ScenarioImpactSerializer(result).data)
