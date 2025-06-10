from datetime import datetime
import re
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_yasg.utils import swagger_auto_schema


from plugins.snt_malaria.models import InterventionAssignment, Scenario

from .serializers import DuplicateScenarioSerializer, ScenarioSerializer


class ScenarioViewSet(viewsets.ModelViewSet):
    """Scenario API

    POST /api/scenarios/duplicate
    Duplicate scenario for specified id
    {
        "id_to_duplicate": Int
    }
    """

    serializer_class = ScenarioSerializer
    ordering_fields = ["id", "name"]
    http_method_names = ["get", "post", "put"]

    def get_queryset(self):
        return Scenario.objects.filter(account=self.request.user.iaso_profile.account)

    def perform_create(self, serializer):
        serializer.validated_data["created_by"] = self.request.user
        serializer.validated_data["account"] = self.request.user.iaso_profile.account
        serializer.save()

    # Custom action to duplicate a scenario
    @swagger_auto_schema(request_body=DuplicateScenarioSerializer(many=False))
    @action(detail=False, methods=["post"], url_path="duplicate")
    def duplicate(self, request):
        serializer = DuplicateScenarioSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        # Duplicate the scenario
        id_to_duplicate = serializer.validated_data.get("id_to_duplicate")
        scenario = get_object_or_404(Scenario, pk=id_to_duplicate)
        scenario.pk = None
        
        # Clean scenario name to keep it clear in case of multiple copies
        clearedName = scenario.name.replace("Copy of", "").strip()
        clearedName = re.sub(r"\s- (\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})\.(\d{6})", "", clearedName)
        # Using datetime to create a unique name for the duplicated scenario
        scenario.name = f"Copy of {clearedName} - {datetime.now().strftime('%Y-%m-%d %H:%M:%S.%f')}"
        scenario.save()

        # Duplicate related assignments
        assignments = InterventionAssignment.objects.filter(scenario_id=id_to_duplicate)
        for assignment in assignments:
            assignment.pk = None
            assignment.scenario = scenario
            assignment.save()

        serializer = self.get_serializer(scenario)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
