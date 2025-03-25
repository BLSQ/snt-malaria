from collections import defaultdict
from decimal import Decimal

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from iaso.models.metric import MetricType, MetricValue
from iaso.models.org_unit import OrgUnit
from plugins.snt_malaria.api.intervention.serializers import InterventionSerializer
from plugins.snt_malaria.api.interventionAssignement.filters import (
    InterventionAssignmentListFilter,
)
from plugins.snt_malaria.models import InterventionAssignment

from .serializers import (
    InterventionAssignmentListSerializer,
    InterventionAssignmentWriteSerializer,
)


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
        # Delete all assignments linked to orgUnits and to the scenario
        InterventionAssignment.objects.filter(scenario=scenario, org_unit__in=org_units).delete()
        # Create InterventionAssignment objects
        assignments = []

        for org_unit in org_units:
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
            {"message": "intervention assignments created successfully."},
            status=status.HTTP_201_CREATED,
        )

    def get_filtered_queryset(self):
        return self.filter_queryset(self.get_queryset()).select_related("intervention", "org_unit")

    def get_org_units(self, org_unit_ids):
        return OrgUnit.objects.filter(id__in=org_unit_ids).values("id", "name").order_by("name")

    @action(detail=False, methods=["get"])
    def grouped_by_org_unit(self, request):
        """
        Group interventions by org_unit
        """
        queryset = self.get_filtered_queryset()

        grouped_data = defaultdict(list)
        for instance in queryset:
            grouped_data[instance.org_unit_id].append(instance.intervention)

        org_units = self.get_org_units(grouped_data.keys())

        formatted_response = []
        for org_unit in org_units:
            org_unit_id = org_unit["id"]
            interventions = grouped_data.get(org_unit_id, [])
            if interventions:
                org_unit["interventions"] = InterventionSerializer(interventions, many=True).data
            formatted_response.append(org_unit)

        return Response(formatted_response)

    @action(detail=False, methods=["get"])
    def budget_per_org_unit(self, request):
        """
        Get total budget per org unit (optimized)
        """
        queryset = self.get_filtered_queryset()
        try:
            # TODO: filter on account
            population_metric = MetricType.objects.get(name__iexact="Population")
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
