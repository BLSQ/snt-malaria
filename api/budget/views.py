import pandas as pd

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from plugins.snt_malaria.api.budget.filters import BudgetListFilter
from plugins.snt_malaria.api.budget.permissions import BudgetPermission
from plugins.snt_malaria.api.budget.serializers import (
    BudgetCreateSerializer,
    BudgetSerializer,
)
from plugins.snt_malaria.api.budget.utils import (
    build_budget_assumptions,
    build_cost_dataframe,
    build_population_dataframe,
)
from plugins.snt_malaria.models.budget import Budget
from plugins.snt_malaria.models.intervention import Intervention
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
    def get_latest(self, _request):
        queryset = self.filter_queryset(self.get_queryset())
        budget = queryset.order_by("-created_at").first()
        if not budget:
            return Response({"detail": "No budget found"}, status=status.HTTP_404_NOT_FOUND)
        serializer = BudgetSerializer(budget)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def get_serializer_class(self):
        if self.action == "create":
            return BudgetCreateSerializer
        return BudgetSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        scenario = serializer.validated_data["scenario"]

        start_year = scenario.start_year
        end_year = scenario.end_year

        pd.set_option("display.max_columns", None)

        # Build cost and population dataframes and format the intervention plan
        cost_df = build_cost_dataframe(
            request.user.iaso_profile.account,
            start_year,
            end_year,
        )

        interventions = Intervention.objects.filter(intervention_category__account=request.user.iaso_profile.account)
        intervention_population_metric_codes = interventions.values_list("target_population", flat=True).distinct()
        intervention_population_metric_codes = list(
            set([code for code_list in intervention_population_metric_codes for code in code_list if code is not None])
        )

        population_df = build_population_dataframe(
            request.user.iaso_profile.account,
            start_year,
            end_year,
            intervention_population_metric_codes=intervention_population_metric_codes,
        )

        budgets = []
        assumptions_by_year = build_budget_assumptions(scenario)

        budget_service = BudgetCalculationService(scenario)

        for year in range(start_year, end_year + 1):
            year_result = budget_service.calculate_year(year)
            budgets.append(year_result)

        budget = Budget.objects.create(
            scenario=scenario,
            name=f"Budget for {scenario.name}",
            cost_input=cost_df.astype(str).to_dict(orient="records"),  # TODO Remove this
            population_input=population_df.astype(str).to_dict(orient="records"),  # TODO Remove this
            assumptions=assumptions_by_year,
            results=[budget_result.model_dump(mode="json") for budget_result in budgets],
            created_by=request.user,
            updated_by=request.user,
        )

        # Return the created budget using the display serializer
        output_serializer = BudgetSerializer(budget)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)
