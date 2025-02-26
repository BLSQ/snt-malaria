from plugins.snt_malaria.models import InterventionAssignment
from .serializers import (
    InterventionAssignmentWriteSerializer,
    InterventionAssignmentListSerializer,
)
from rest_framework.response import Response
from rest_framework import viewsets, status


class InterventionAssignmentViewSet(viewsets.ModelViewSet):
    queryset = InterventionAssignment.objects.all()
    serializer_class = InterventionAssignmentWriteSerializer
    http_method_names = ["get", "post"]

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
