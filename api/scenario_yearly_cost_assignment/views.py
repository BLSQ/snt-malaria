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
        if self.action == "patch":
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

    def perform_create(self, serializer):
        response = super().perform_create(serializer)
        # After creating/updating the ScenarioYearlyCostAssignment, we need to recalculate the budget for the related scenario to reflect the changes in the assigned costs
        scenario = serializer.validated_data["scenario"]
        budget_service = BudgetCalculationService(scenario)
        budget_service.calculate_and_save_all_years(self.request.user)

        return response

    def perform_update(self, serializer):
        response = super().perform_update(serializer)
        # After creating/updating the ScenarioYearlyCostAssignment, we need to recalculate the budget for the related scenario to reflect the changes in the assigned costs
        scenario = serializer.validated_data["scenario"]
        budget_service = BudgetCalculationService(scenario)
        budget_service.calculate_and_save_all_years(self.request.user)

        return response

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = serializer.save()
        response_serializer = ScenarioYearlyCostAssignmentSerializer(result, many=True)
        return Response(response_serializer.data, status=status.HTTP_200_OK)
