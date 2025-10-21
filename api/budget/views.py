import pandas as pd

from rest_framework import status, viewsets
from rest_framework.response import Response
from snt_malaria_budgeting import (
    DEFAULT_COST_ASSUMPTIONS,
    InterventionDetailModel,
    get_budget,
)

from plugins.snt_malaria.api.budget.filters import BudgetListFilter
from plugins.snt_malaria.api.budget.serializers import BudgetCreateSerializer, BudgetSerializer
from plugins.snt_malaria.api.budget.utils import build_cost_dataframe, build_population_dataframe
from plugins.snt_malaria.models.budget import Budget


class BudgetViewSet(viewsets.ModelViewSet):
    ordering_fields = ["id", "name"]
    http_method_names = ["get", "options", "post"]
    serializer_class = BudgetSerializer
    filterset_class = BudgetListFilter

    def get_queryset(self):
        return Budget.objects.select_related("scenario").filter(
            scenario__account=self.request.user.iaso_profile.account
        )

    def get_serializer_class(self):
        if self.action == "create":
            return BudgetCreateSerializer
        return BudgetSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        scenario = serializer.validated_data["scenario"]

        # TODO: Years should come from the frontend
        start_year = 2025
        end_year = 2027

        pd.set_option("display.max_columns", None)

        # Build cost data from database models
        cost_df = build_cost_dataframe(request.user.iaso_profile.account)

        # Build population data from MetricType
        population_df = build_population_dataframe(request.user.iaso_profile.account)

        # Format the interventions to fit the requirement of the budgeting library.
        # e.g.
        # interventions = [
        #     {"name": "smc", "type": "SP+AQ", "places": [1, 2, 3]}, # list of org_unit_id
        #     {"name": "vacc", "type": "R21", "places": [1, 2, 3, 4, 5]},
        #     {"name": "iptp", "type": "SP", "places": [3, 4, 5]},
        # ]
        interventions_dict = {}
        assignments = scenario.intervention_assignments.select_related("intervention", "org_unit").all()

        for assignment in assignments:
            intervention_code = assignment.intervention.name.lower()
            org_unit_id = assignment.org_unit.id

            # Group by intervention name and type
            if intervention_code not in interventions_dict:
                interventions_dict[intervention_code] = {"name": intervention_code, "type": "SP+AQ", "places": []}
            interventions_dict[intervention_code]["places"].append(org_unit_id)

        interventions = list(interventions_dict.values())
        print("interventions", interventions)
        interventions_input = [InterventionDetailModel(**i) for i in interventions]

        budgets = []

        print("cost_df", cost_df)
        print("population_df", population_df)
        settings = DEFAULT_COST_ASSUMPTIONS

        for year in range(start_year, end_year + 1):
            print(f"Fetching budget for year: {year}")
            budgets.append(
                get_budget(
                    year=year,
                    spatial_planning_unit="org_unit_id",
                    interventions_input=interventions_input,
                    settings=settings,
                    cost_df=cost_df,
                    population_df=population_df,
                    cost_overrides=[],  # optional
                    local_currency="EUR",
                )
            )

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
