from datetime import datetime

from django.shortcuts import get_object_or_404
from drf_yasg.utils import swagger_auto_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from plugins.snt_malaria.models import InterventionAssignment, Scenario

from .serializers import CalculateBudgetSerializer, DuplicateScenarioSerializer, ScenarioSerializer


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
    http_method_names = ["get", "post", "put", "delete"]

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

        scenario.name = f"Copy of {scenario.name}"

        duplicate = Scenario.objects.filter(name=scenario.name)
        if duplicate.exists():
            # If a scenario with the same name already exists, append a timestamp to the name
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")
            scenario.name = f"{scenario.name} - {timestamp}"

        try:
            scenario.save()
        except Exception as e:
            raise ValidationError(f"Error saving scenario: {e}")

        # Duplicate related intevention assignments
        assignments = InterventionAssignment.objects.filter(scenario_id=id_to_duplicate)
        for assignment in assignments:
            assignment.pk = None
            assignment.scenario = scenario
            assignment.save()
        serializer = self.get_serializer(scenario)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="calculate_budget")
    def calculate_budget(self, request, pk=None):
        serializer = CalculateBudgetSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        scenario = serializer.validated_data["scenario"]
        budget_data = {
            "scenario_id": scenario.id,
            "scenario_name": scenario.name,
            "total_budget": 0,
            "status": "calculated",
            "intervention_budget": serializer.get_dummy_budget(),
        }

        return Response(budget_data, status=status.HTTP_200_OK)
