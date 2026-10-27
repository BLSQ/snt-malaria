from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from plugins.snt_malaria.api.budget.filters import BudgetListFilter
from plugins.snt_malaria.api.budget.permissions import BudgetPermission
from plugins.snt_malaria.api.budget.serializers import (
    BudgetCreateSerializer,
    BudgetSerializer,
)
from plugins.snt_malaria.models.budget import Budget
from plugins.snt_malaria.models.scenario import Scenario
from plugins.snt_malaria.services import BudgetCalculationService


class BudgetViewSet(viewsets.ModelViewSet):
    ordering_fields = ["id", "name"]
    http_method_names = ["get", "options", "post"]
    serializer_class = BudgetSerializer
    filterset_class = BudgetListFilter
    permission_classes = [BudgetPermission]

    def get_queryset(self):
        return Budget.objects.select_related("scenario").filter(
            scenario__account=self.request.user.iaso_profile.account
        )

    @action(detail=False, methods=["get"])
    def by_grant(self, request):
        """Return the scenario budget aggregated by grant.

        Costs are attributed to the assignment's grant, falling back to the
        intervention's grant; unattributed costs come back with grant_id None.
        Computed on the fly from the current scenario data.
        """
        scenario, error_response = self._get_scenario_from_query_params(request)
        if error_response:
            return error_response

        budget_service = BudgetCalculationService(scenario)
        grant_costs = budget_service.calculate_grant_costs()
        return Response(
            {
                "scenario_id": scenario.id,
                "grant_costs": [item.model_dump(mode="json") for item in grant_costs],
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"])
    def get_latest(self, request):
        """Return the scenario budget for every year, computed on the fly from the current scenario data."""
        scenario, error_response = self._get_scenario_from_query_params(request)
        if error_response:
            return error_response

        results = BudgetCalculationService(scenario).calculate_all_years()
        return Response(
            {
                "scenario": scenario.id,
                "results": [year_result.model_dump(mode="json") for year_result in results],
            },
            status=status.HTTP_200_OK,
        )

    def _get_scenario_from_query_params(self, request):
        scenario_id = request.query_params.get("scenario_id")
        if not scenario_id:
            return None, Response({"detail": "scenario_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        scenario = Scenario.objects.filter(id=scenario_id, account=request.user.iaso_profile.account).first()
        if not scenario:
            return None, Response({"detail": "Scenario not found"}, status=status.HTTP_404_NOT_FOUND)
        return scenario, None

    def get_serializer_class(self):
        if self.action == "create":
            return BudgetCreateSerializer
        return BudgetSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        scenario = serializer.validated_data["scenario"]

        budget_service = BudgetCalculationService(scenario)
        budget = budget_service.calculate_and_save_all_years(request.user)

        # Return the created budget using the display serializer
        output_serializer = BudgetSerializer(budget)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)
