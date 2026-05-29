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

            interventions_costs = [
                {
                    "id": intervention.id,
                    "code": intervention.code,
                    "type": intervention.type,
                    "total_cost": float(intervention.total_cost),
                    "total_pop": float(intervention.total_pop),
                    "quantity": float(intervention.quantity),
                    "cost_breakdown": [
                        {
                            "id": breakdown.id,
                            "category": breakdown.category,
                            "cost_class": breakdown.cost_class,
                            "cost": float(breakdown.total_cost),
                            "total_cost": float(breakdown.total_cost),
                            "quantity": float(breakdown.quantity),
                        }
                        for breakdown in intervention.cost_breakdown
                    ],
                }
                for intervention in year_result.interventions
            ]

            places_costs = [
                {
                    "org_unit_id": org_unit.org_unit_id,
                    "total_cost": float(org_unit.total_cost),
                    "quantity": float(org_unit.quantity),
                    "interventions": [
                        {
                            "id": intervention.id,
                            "code": intervention.code,
                            "type": intervention.type,
                            "total_cost": float(intervention.total_cost),
                            "quantity": float(intervention.quantity),
                            "cost_breakdown": [
                                {
                                    "id": breakdown.id,
                                    "category": breakdown.category,
                                    "cost_class": breakdown.cost_class,
                                    "cost": float(breakdown.total_cost),
                                    "total_cost": float(breakdown.total_cost),
                                    "quantity": float(breakdown.quantity),
                                }
                                for breakdown in intervention.cost_breakdown
                            ],
                        }
                        for intervention in org_unit.interventions
                    ],
                }
                for org_unit in year_result.org_units_costs
            ]

            budgets.append(
                {
                    "year": year,
                    "total_cost": float(year_result.total_cost),
                    "quantity": float(year_result.quantity),
                    "interventions": interventions_costs,
                    "org_units_costs": places_costs,
                    "category_costs": [
                        {
                            "id": category.id,
                            "category": category.category,
                            "cost_class": category.cost_class,
                            "cost": float(category.total_cost),
                            "total_cost": float(category.total_cost),
                            "quantity": float(category.quantity),
                        }
                        for category in year_result.category_costs
                    ],
                }
            )

        budget = Budget.objects.create(
            scenario=scenario,
            name=f"Budget for {scenario.name}",
            cost_input=cost_df.astype(str).to_dict(orient="records"),  # TODO Remove this
            population_input=population_df.astype(str).to_dict(orient="records"),  # TODO Remove this
            assumptions=assumptions_by_year,
            results=budgets,
            created_by=request.user,
            updated_by=request.user,
        )

        # Return the created budget using the display serializer
        output_serializer = BudgetSerializer(budget)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)
