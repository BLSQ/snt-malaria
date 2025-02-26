from collections import defaultdict
from iaso.models.org_unit import OrgUnit
from plugins.snt_malaria.api.intervention.serializers import InterventionSerializer
from plugins.snt_malaria.api.interventionAssignement.filters import (
    InterventionAssignmentListFilter,
)
from plugins.snt_malaria.models import InterventionAssignment
from .serializers import (
    InterventionAssignmentWriteSerializer,
    InterventionAssignmentListSerializer,
)
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import viewsets, status
from django_filters.rest_framework import DjangoFilterBackend


class InterventionAssignmentViewSet(viewsets.ModelViewSet):
    queryset = InterventionAssignment.objects.all()
    serializer_class = InterventionAssignmentWriteSerializer
    http_method_names = ["get", "post"]
    filter_backends = [DjangoFilterBackend]
    filterset_class = InterventionAssignmentListFilter

    def get_serializer_class(self):
        if self.request.method == "GET":
            return InterventionAssignmentListSerializer
        return InterventionAssignmentWriteSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Get validated objects
        scenario = serializer.validated_data["scenario"]
        org_units = serializer.validated_data["valid_org_units"]
        interventions = serializer.validated_data["valid_interventions"]
        created_by = request.user

        # Create InterventionAssignment objects
        assignments = []

        for org_unit in org_units:
            for intervention in interventions:
                # Check if the InterventionAssignment already exists
                existing_assignment = InterventionAssignment.objects.filter(
                    scenario=scenario, org_unit=org_unit, intervention=intervention
                ).exists()

                # Only create and add to the list if it does not exist
                if not existing_assignment:
                    assignment = InterventionAssignment(
                        scenario=scenario,
                        org_unit=org_unit,
                        intervention=intervention,
                        created_by=created_by,
                    )
                    assignments.append(assignment)

            # Bulk create
            InterventionAssignment.objects.bulk_create(assignments)

            return Response(
                {"message": "intervention assignments created successfully."},
                status=status.HTTP_201_CREATED,
            )

    @action(detail=False, methods=["get"])
    def grouped_by_org_unit(self, request):
        """
        Group interventions by org_unit
        """
        queryset = self.filter_queryset(self.get_queryset())

        grouped_data = defaultdict(list)
        for instance in queryset:
            grouped_data[instance.org_unit_id].append(instance.intervention)

        org_units = OrgUnit.objects.filter(id__in=grouped_data.keys()).values(
            "id", "name"
        )

        formatted_response = []
        for org_unit in org_units:
            org_unit_id = org_unit["id"]
            interventions = grouped_data.get(org_unit_id, [])
            if interventions:
                org_unit["interventions"] = InterventionSerializer(
                    interventions, many=True
                ).data
            formatted_response.append(org_unit)

        return Response(formatted_response)
