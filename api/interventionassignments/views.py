from collections import defaultdict
from decimal import Decimal

from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from iaso.models.metric import MetricType, MetricValue
from iaso.models.org_unit import OrgUnit
from plugins.snt_malaria.api.interventionassignments.filters import (
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
        return InterventionAssignment.objects.prefetch_related("intervention__intervention_category__account").filter(
            intervention__intervention_category__account=self.request.user.iaso_profile.account
        )

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
                # filter out existing org units
                if InterventionAssignment.objects.filter(
                    scenario=scenario, org_unit=org_unit, intervention=intervention
                ).exists():
                    continue
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
            {"message": "intervention assignments created successfully."},
            status=status.HTTP_201_CREATED,
        )

    def destroy(self, _request, pk=None):
        assignment = get_object_or_404(InterventionAssignment, id=pk)
        assignment.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)

    def get_filtered_queryset(self):
        return self.filter_queryset(self.get_queryset()).prefetch_related("org_unit")

    def get_org_units(self, org_unit_ids):
        return OrgUnit.objects.filter(id__in=org_unit_ids).values("id", "name").order_by("name")

    @action(detail=False, methods=["get"])
    def budget_per_org_unit(self, request):
        """
        Get total budget per org unit (optimized)
        """
        queryset = self.get_filtered_queryset()
        try:
            user_account = self.request.user.iaso_profile.account
            population_metric = MetricType.objects.get(name__iexact="Population", account=user_account)
        except MetricType.DoesNotExist:
            return Response({"error": "Population MetricType not found"}, status=400)

        org_units = queryset.values_list("org_unit_id", flat=True).distinct()
        population_values = {
            mv.org_unit_id: Decimal(mv.value)
            for mv in MetricValue.objects.filter(metric_type=population_metric, org_unit__in=org_units)
        }

        budget_per_org_unit = defaultdict(Decimal)

        for assignment in queryset:
            org_unit_id = assignment.org_unit_id
            cost_per_unit = assignment.intervention.cost_per_unit

            if cost_per_unit is not None and population_values[org_unit_id]:
                budget_per_org_unit[org_unit_id] += cost_per_unit * population_values[org_unit_id]

        org_units = self.get_org_units(budget_per_org_unit.keys())

        formatted_response = []
        for org_unit in org_units:
            org_unit_id = org_unit["id"]
            budget = budget_per_org_unit[org_unit_id]
            if budget:
                org_unit["budget"] = budget_per_org_unit[org_unit_id]
            formatted_response.append(org_unit)

        return Response(formatted_response)
