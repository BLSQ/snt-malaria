from datetime import datetime

from django.shortcuts import get_object_or_404
from drf_yasg.utils import swagger_auto_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from plugins.snt_malaria.models import InterventionAssignment, Scenario
from plugins.snt_malaria.models.intervention import InterventionMix

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

        # Duplicate related mixes
        mixes = InterventionMix.objects.filter(scenario_id=id_to_duplicate)
        for mix in mixes:
            prevMixPk = mix.pk
            prevMixInterventions = mix.interventions.all()
            mix.pk = None
            mix.scenario = scenario
            mix.save()
            mix.interventions.set(prevMixInterventions)
            mixAssignments = InterventionAssignment.objects.filter(
                scenario_id=id_to_duplicate, intervention_mix_id=prevMixPk
            )
            for assignment in mixAssignments:
                assignment.pk = None
                assignment.scenario = scenario
                assignment.intervention_mix = mix
                assignment.save()
        serializer = self.get_serializer(scenario)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
