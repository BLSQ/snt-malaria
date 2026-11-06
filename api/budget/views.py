from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from plugins.snt_malaria.api.budget.serializers import BudgetQuerySerializer
from plugins.snt_malaria.api.workspace_scoped import WorkspaceScopedViewSetMixin
from plugins.snt_malaria.models.scenario import Scenario
from plugins.snt_malaria.services import BudgetCalculationService


class BudgetViewSet(WorkspaceScopedViewSetMixin, viewsets.ViewSet):
    """Scenario budgets, computed on the fly from the current scenario data."""

    permission_classes = [IsAuthenticated]

    def list(self, request):
        """Return the scenario budget for every year of the scenario."""
        scenario, error_response = self._get_scenario_from_query_params(request)
        if error_response:
            return error_response

        service = BudgetCalculationService(scenario, org_unit_ids=self._get_org_unit_ids(request))
        results = service.calculate_all_years()
        return Response(
            {
                "scenario": scenario.id,
                "results": [year_result.model_dump(mode="json") for year_result in results],
                "fixed_costs_prorated": service.prorates_fixed_costs,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"])
    def by_grant(self, request):
        """Return the scenario budget aggregated by grant.

        Costs are attributed to the assignment's grant, falling back to the
        intervention's grant; unattributed costs come back with grant_id None.
        """
        scenario, error_response = self._get_scenario_from_query_params(request)
        if error_response:
            return error_response

        service = BudgetCalculationService(scenario, org_unit_ids=self._get_org_unit_ids(request))
        grant_costs = service.calculate_grant_costs()
        return Response(
            {
                "scenario_id": scenario.id,
                "grant_costs": [item.model_dump(mode="json") for item in grant_costs],
            },
            status=status.HTTP_200_OK,
        )

    @staticmethod
    def _get_org_unit_ids(request):
        serializer = BudgetQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        return serializer.validated_data["org_unit_ids"]

    def _get_scenario_from_query_params(self, request):
        scenario_id = request.query_params.get("scenario_id")
        if not scenario_id:
            return None, Response({"detail": "scenario_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            scenario_id = int(scenario_id)
        except ValueError:
            return None, Response({"detail": "scenario_id must be an integer"}, status=status.HTTP_400_BAD_REQUEST)

        scenario = Scenario.objects.filter(id=scenario_id, workspace=self.workspace).first()
        if not scenario:
            return None, Response({"detail": "Scenario not found"}, status=status.HTTP_404_NOT_FOUND)
        return scenario, None
