from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils.translation import gettext_lazy as _
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from plugins.snt_malaria.api.intervention_assignments.filters import (
    InterventionAssignmentListFilter,
)
from plugins.snt_malaria.models import InterventionAssignment

from .serializers import (
    InterventionAssignmentListSerializer,
    InterventionAssignmentWriteSerializer,
)


class InterventionAssignmentViewSet(viewsets.ModelViewSet):
    http_method_names = ["get", "post", "delete"]
    filter_backends = [DjangoFilterBackend]
    filterset_class = InterventionAssignmentListFilter

    def get_queryset(self):
        return InterventionAssignment.objects.prefetch_related(
            "intervention__intervention_category__account", "org_unit"
        ).filter(intervention__intervention_category__account=self.request.user.iaso_profile.account)

    def get_serializer_class(self):
        if self.request.method == "GET":
            return InterventionAssignmentListSerializer
        return InterventionAssignmentWriteSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Get validated objects
        scenario = serializer.validated_data["scenario"]
        valid_orgunit_interventions = serializer.validated_data["valid_orgunit_interventions"]

        created_by = request.user
        # Create InterventionAssignment objects
        assignments = []
        with transaction.atomic():
            delta = 0
            for ou_interventions in valid_orgunit_interventions:
                org_unit, interventions = ou_interventions["org_unit"], ou_interventions["interventions"]
                # Delete existing assignments of same category for this org unit and scenario
                existing_interventions = InterventionAssignment.objects.select_related(
                    "intervention__intervention_category"
                ).filter(
                    scenario=scenario,
                    org_unit=org_unit,
                    intervention__intervention_category__in=[i.intervention_category for i in interventions],
                )
                delta += len(interventions) - existing_interventions.count()
                existing_interventions.delete()

                for intervention in interventions:
                    assignment = InterventionAssignment(
                        scenario=scenario,
                        org_unit=org_unit,
                        intervention=intervention,
                        created_by=created_by,
                    )
                    assignments.append(assignment)

            # Bulk create
            if assignments:
                InterventionAssignment.objects.bulk_create(assignments)

            return Response(
                {"message": _("{delta} districts added to plan").format(delta=delta)},
                status=status.HTTP_201_CREATED,
            )

    def destroy(self, _request, pk=None):
        assignment = get_object_or_404(InterventionAssignment, id=pk)
        scenario = assignment.scenario
        if scenario.is_locked:
            return Response(
                {"scenario_id": _("The scenario is locked and cannot be modified.")},
                status=status.HTTP_400_BAD_REQUEST,
            )
        assignment.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["delete"])
    def delete_many(self, request):
        ids_param = request.query_params.get("ids", "")
        if not ids_param:
            return Response({"error": "No ids provided."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            ids = [int(i) for i in ids_param.split(",") if i.strip()]
        except ValueError:
            return Response({"error": "Invalid ids format."}, status=status.HTTP_400_BAD_REQUEST)
        assignments = InterventionAssignment.objects.select_related("scenario").filter(id__in=ids)
        for assignment in assignments:
            scenario = assignment.scenario
            if scenario.is_locked:
                return Response(
                    {"scenario_id": "The scenario is locked and cannot be modified."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        deleted_count, _ = assignments.delete()
        return Response(
            {"message": f"{deleted_count} intervention assignments deleted."},
            status=status.HTTP_204_NO_CONTENT,
        )
