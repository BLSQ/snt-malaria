import pandas as pd

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from snt_malaria_budgeting import DEFAULT_COST_ASSUMPTIONS, BudgetCalculator

from plugins.snt_malaria.api.budget.filters import BudgetListFilter
from plugins.snt_malaria.api.budget.serializers import BudgetCreateSerializer, BudgetSerializer
from plugins.snt_malaria.api.budget.utils import (
    build_cost_dataframe,
    build_interventions_input,
    build_population_dataframe,
)
from plugins.snt_malaria.models.budget import Budget
from plugins.snt_malaria.models.intervention import Intervention


class BudgetViewSet(viewsets.ModelViewSet):
    ordering_fields = ["id", "name"]
    http_method_names = ["get", "options", "post"]
    serializer_class = BudgetSerializer
    filterset_class = BudgetListFilter

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
        cost_df = build_cost_dataframe(request.user.iaso_profile.account)
        population_df = build_population_dataframe(request.user.iaso_profile.account, start_year, end_year)
        interventions_input = build_interventions_input(scenario)
        interventions = Intervention.objects.all()

        # build a quick lookup map ((code, type) -> id) for fast id retrieval
        interventions_map = {(iv.code, iv.name): iv.id for iv in interventions}

        # For now, assume the default coverage etc.
        settings = DEFAULT_COST_ASSUMPTIONS

        budgets = []
        budget_calculator = BudgetCalculator(
            interventions_input=interventions_input,
            settings=settings,
            cost_df=cost_df,
            population_df=population_df,
            local_currency="EUR",
            spatial_planning_unit="org_unit_id",
        )

        for year in range(start_year, end_year + 1):
            interventions_costs = budget_calculator.get_interventions_costs(year)
            places_costs = budget_calculator.get_places_costs(year)

            for intervention in interventions_costs:
                for cost_breakdown in intervention["cost_breakdown"]:
                    cost_breakdown["category"] = cost_breakdown.get("cost_class", "")
                    cost_breakdown.pop("cost_class", None)

            for place_cost in places_costs:
                place_cost["org_unit_id"] = place_cost.get("place")
                place_cost.pop("place")
                for place_cost_intervention in place_cost.get("interventions", []):
                    code = place_cost_intervention["code"]
                    type_ = place_cost_intervention["type"]
                    intervention_id = interventions_map.get((code, type_))
                    # attach the found intervention (or None) for downstream use
                    place_cost_intervention["id"] = intervention_id

            budgets.append({"year": year, "interventions": interventions_costs, "org_units_costs": places_costs})

        budget = Budget.objects.create(
            scenario=scenario,
            name=f"Budget for {scenario.name}",
            cost_input={},
            assumptions=settings,
            results=budgets,
            created_by=request.user,
            updated_by=request.user,
        )

        # Return the created budget using the display serializer
        output_serializer = BudgetSerializer(budget)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)
