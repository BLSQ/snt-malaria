from rest_framework import status, viewsets
from rest_framework.response import Response

from plugins.snt_malaria.api.scenario_yearly_cost_assignment.permissions import ScenarioYearlyCostAssignmentPermission
from plugins.snt_malaria.api.scenario_yearly_cost_assignment.serializers import (
    ScenarioYearlyCostAssignmentQuerySerializer,
    ScenarioYearlyCostAssignmentSerializer,
    ScenarioYearlyCostAssignmentUpsertSerializer,
)
from plugins.snt_malaria.models import ScenarioYearlyCostAssignment
from plugins.snt_malaria.services import BudgetCalculationService


class ScenarioYearlyCostAssignmentViewSet(viewsets.ModelViewSet):
    http_method_names = ["get", "options", "post", "patch"]
    permission_classes = [ScenarioYearlyCostAssignmentPermission]

    def get_serializer_class(self):
        if self.action == "list":
            return ScenarioYearlyCostAssignmentQuerySerializer
        if self.action in ["create", "partial_update"]:
            return ScenarioYearlyCostAssignmentUpsertSerializer
        return ScenarioYearlyCostAssignmentSerializer

    def get_queryset(self):
        return ScenarioYearlyCostAssignment.objects.select_related("scenario", "cost_line").filter(
            scenario__account=self.request.user.iaso_profile.account
        )

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        scenario = serializer.validated_data["scenario"]

        scenario_yearly_costs = self.get_queryset().filter(scenario=scenario).order_by("year", "id")
        list_serializer = ScenarioYearlyCostAssignmentSerializer(scenario_yearly_costs, many=True)

        return Response(list_serializer.data, status=status.HTTP_200_OK)

    def _recalculate_budget(self, scenario):
        BudgetCalculationService(scenario).calculate_and_save_all_years(self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        response_serializer = ScenarioYearlyCostAssignmentSerializer(
            serializer.instance, context=self.get_serializer_context()
        )
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    def perform_create(self, serializer):
        response = super().perform_create(serializer)
        # After creating/updating the ScenarioYearlyCostAssignment, we need to recalculate the budget for the related scenario to reflect the changes in the assigned costs
        scenario = serializer.validated_data["scenario"]
        self._recalculate_budget(scenario)

        return response

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=kwargs.pop("partial", False))
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        response_serializer = ScenarioYearlyCostAssignmentSerializer(
            serializer.instance, context=self.get_serializer_context()
        )
        return Response(response_serializer.data, status=status.HTTP_200_OK)

    def perform_update(self, serializer):
        response = super().perform_update(serializer)
        # After creating/updating the ScenarioYearlyCostAssignment, we need to recalculate the budget for the related scenario to reflect the changes in the assigned costs
        scenario = serializer.instance.scenario
        self._recalculate_budget(scenario)

        return response
