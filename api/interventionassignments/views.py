from collections import defaultdict
from decimal import Decimal

from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from iaso.api.common import DeletionFilterBackend
from iaso.models.metric import MetricType, MetricValue
from iaso.models.org_unit import OrgUnit
from plugins.snt_malaria.api.interventionassignments.filters import (
    InterventionAssignmentListFilter,
)
from plugins.snt_malaria.models import InterventionAssignment
from plugins.snt_malaria.models.intervention import InterventionMix

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
            "intervention_mix__interventions__intervention_category__account"
        ).filter(intervention_mix__interventions__intervention_category__account=self.request.user.iaso_profile.account)

    def get_serializer_class(self):
        if self.request.method == "GET":
            return InterventionAssignmentListSerializer
        return InterventionAssignmentWriteSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Get validated objects
        mix_name = serializer.validated_data["mix_name"]
        scenario = serializer.validated_data["scenario"]
        org_units = serializer.validated_data["valid_org_units"]
        interventions = serializer.validated_data["valid_interventions"]
        selected_mix = serializer.validated_data["selected_mix"]

        created_by = request.user
        # create the created or selected intervention mix and link it the interventions
        if selected_mix:
            intervention_mix = selected_mix
        else:
            intervention_mix, created = InterventionMix.objects.get_or_create(
                name=mix_name, account=self.request.user.iaso_profile.account, scenario=scenario
            )
            intervention_mix.interventions.add(*interventions)

        # Create InterventionAssignment objects
        assignments = []
        for org_unit in org_units:
            # filter out existing org units
            if InterventionAssignment.objects.filter(
                scenario=scenario, org_unit=org_unit, intervention_mix=intervention_mix
            ).exists():
                continue
            assignment = InterventionAssignment(
                scenario=scenario,
                org_unit=org_unit,
                intervention_mix=intervention_mix,
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

    def delete(self, request, *args, **kwargs):
        if (
            "scenario_id" not in request.query_params
            and "intervention_mix_id" not in request.query_params
            and "org_unit_id" not in request.query_params
        ):
            return Response(
                {
                    "message": "Missing one or many of required query params: scenario_id, intervention_mix_id, org_unit_id"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        scenario_id = request.query_params["scenario_id"]
        intervention_mix_id = request.query_params["intervention_mix_id"]
        org_unit_id = request.query_params["org_unit_id"]

        # Trying to find assignment, if none found, a 404 is thrown. If many are found, another exception will be thrown
        assignment = get_object_or_404(
            InterventionAssignment,
            scenario_id=scenario_id,
            intervention_mix=intervention_mix_id,
            org_unit_id=org_unit_id,
        )

        assignment.delete()

        return Response(status=status.HTTP_200_OK)
        # log_modification(assignments, original, INSTANCE_API, user=request.user)

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
