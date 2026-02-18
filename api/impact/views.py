from rest_framework import viewsets
from rest_framework.response import Response

from plugins.snt_malaria.services.impact import ImpactService

from .serializers import ImpactProviderSerializer, ImpactQuerySerializer, ScenarioImpactSerializer


class ImpactYearRangeViewSet(viewsets.ViewSet):
    http_method_names = ["get", "options"]

    def list(self, request):
        serializer = ImpactProviderSerializer(data={}, context={"request": request})
        serializer.is_valid(raise_exception=True)
        provider = serializer.validated_data["provider"]
        min_year, max_year = provider.get_year_range()
        return Response({"min_year": min_year, "max_year": max_year})


class ImpactAgeGroupsViewSet(viewsets.ViewSet):
    http_method_names = ["get", "options"]

    def list(self, request):
        serializer = ImpactProviderSerializer(data={}, context={"request": request})
        serializer.is_valid(raise_exception=True)
        provider = serializer.validated_data["provider"]
        age_groups = provider.get_age_groups()
        return Response({"age_groups": age_groups})


class ImpactViewSet(viewsets.ViewSet):
    http_method_names = ["get", "options"]

    def list(self, request):
        serializer = ImpactQuerySerializer(data=request.query_params, context={"request": request})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        service = ImpactService(data["provider"])
        result = service.get_scenario_impact(
            scenario=data["scenario"],
            age_group=data["age_group"],
            year_from=data["year_from"],
            year_to=data["year_to"],
        )
        return Response(ScenarioImpactSerializer(result).data)
