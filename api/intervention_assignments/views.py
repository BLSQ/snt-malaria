from collections import defaultdict
from decimal import Decimal

from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils.translation import gettext_lazy as _
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from iaso.models.metric import MetricType, MetricValue
from iaso.models.org_unit import OrgUnit
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
                # Delete existing assignments
                existingInterventions = InterventionAssignment.objects.filter(scenario=scenario, org_unit=org_unit)
                delta += len(interventions) - existingInterventions.count()
                existingInterventions.delete()

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
        deleted_count, _ = InterventionAssignment.objects.filter(id__in=ids).delete()
        return Response(
            {"message": f"{deleted_count} intervention assignments deleted."},
            status=status.HTTP_204_NO_CONTENT,
        )

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
            unit_cost = assignment.intervention.unit_cost

            if unit_cost is not None and population_values[org_unit_id]:
                budget_per_org_unit[org_unit_id] += unit_cost * population_values[org_unit_id]

        org_units = self.get_org_units(budget_per_org_unit.keys())

        formatted_response = []
        for org_unit in org_units:
            org_unit_id = org_unit["id"]
            budget = budget_per_org_unit[org_unit_id]
            if budget:
                org_unit["budget"] = budget_per_org_unit[org_unit_id]
            formatted_response.append(org_unit)

        return Response(formatted_response)
