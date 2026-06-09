from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from plugins.snt_malaria.api.interventions.permissions import InterventionPermission
from plugins.snt_malaria.api.interventions.serializers import (
    InterventionDetailSerializer,
    InterventionDetailWriteSerializer,
    InterventionSerializer,
)
from plugins.snt_malaria.models import Intervention
from plugins.snt_malaria.models.intervention import InterventionAssignment
from plugins.snt_malaria.services import BudgetCalculationService


class InterventionViewSet(viewsets.ModelViewSet):
    serializer_class = InterventionSerializer
    ordering_fields = ["id", "name"]
    http_method_names = ["get", "options", "put"]
    permission_classes = [InterventionPermission]

    def get_queryset(self):
        return Intervention.objects.filter(intervention_category__account=self.request.user.iaso_profile.account)

    @action(detail=True, methods=["get"], serializer_class=InterventionDetailSerializer)
    def details(self, request, pk):
        result = self.get_object()
        serializer = self.get_serializer(result)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["put"], serializer_class=InterventionDetailWriteSerializer)
    @transaction.atomic
    def update_details(self, request, pk):
        intervention = self.get_object()
        serializer = self.get_serializer(intervention, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        # Refresh budget for all scenarios with at least 1 assignment of that intervention
        # As it might impact cost lines.
        scenario_ids = (
            InterventionAssignment.objects.filter(intervention=intervention)
            .values_list("scenario_id", flat=True)
            .distinct()
        )

        scenarios = intervention.intervention_category.account.scenario_set.filter(id__in=scenario_ids)
        for scenario in scenarios:
            budget_service = BudgetCalculationService(scenario)
            budget_service.calculate_and_save_all_years(self.request.user)

        return Response(InterventionDetailSerializer(intervention).data, status=status.HTTP_200_OK)
