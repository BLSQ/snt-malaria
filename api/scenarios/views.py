from datetime import datetime
from pathlib import Path

import pandas as pd

from django.db import IntegrityError
from django.shortcuts import get_object_or_404
from django.utils.translation import gettext_lazy as _
from drf_yasg.utils import swagger_auto_schema
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from snt_malaria_budgeting import InterventionCostModel, InterventionDetailModel, get_budget

from plugins.snt_malaria.api.budgeting.utils import build_population_dataframe
from plugins.snt_malaria.models import InterventionAssignment, Scenario

from .serializers import CalculateBudgetSerializer, DuplicateScenarioSerializer, ScenarioSerializer


class ScenarioViewSet(viewsets.ModelViewSet):
    """Scenario API

    POST /api/scenarios/duplicate
    Duplicate scenario for specified id
    {
        "id_to_duplicate": Int
    }
    """

    serializer_class = ScenarioSerializer
    ordering_fields = ["id", "name"]
    http_method_names = ["get", "post", "put", "delete"]

    def get_queryset(self):
        return Scenario.objects.filter(account=self.request.user.iaso_profile.account)

    def perform_create(self, serializer):
        serializer.validated_data["created_by"] = self.request.user
        serializer.validated_data["account"] = self.request.user.iaso_profile.account
        serializer.save()

    def perform_update(self, serializer):
        serializer.validated_data["updated_by"] = self.request.user
        try:
            serializer.save()
        except IntegrityError as e:
            if "duplicate" in str(e).lower() and "(account_id, name)" in str(e).lower():
                raise serializers.ValidationError(_("Scenario with this name already exists."))
            if "snt_malaria_scenario_end_year_gte_start_year" in str(e).lower():
                raise serializers.ValidationError(_("Start year should be lower or equal end year."))
            raise serializers.ValidationError(str(e))

    # Custom action to duplicate a scenario
    @swagger_auto_schema(request_body=DuplicateScenarioSerializer(many=False))
    @action(detail=False, methods=["post"], url_path="duplicate")
    def duplicate(self, request):
        serializer = DuplicateScenarioSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        # Duplicate the scenario
        id_to_duplicate = serializer.validated_data.get("id_to_duplicate")
        scenario = get_object_or_404(Scenario, pk=id_to_duplicate)
        scenario.pk = None

        scenario.name = f"Copy of {scenario.name}"

        duplicate = Scenario.objects.filter(name=scenario.name)
        if duplicate.exists():
            # If a scenario with the same name already exists, append a timestamp to the name
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")
            scenario.name = f"{scenario.name} - {timestamp}"

        try:
            scenario.save()
        except Exception as e:
            raise ValidationError(f"Error saving scenario: {e}")

        # Duplicate related intevention assignments
        assignments = InterventionAssignment.objects.filter(scenario_id=id_to_duplicate)
        for assignment in assignments:
            assignment.pk = None
            assignment.scenario = scenario
            assignment.save()
        serializer = self.get_serializer(scenario)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="calculate_budget")
    def calculate_budget(self, request, pk=None):
        serializer = CalculateBudgetSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        scenario = serializer.validated_data["scenario"]

        # TODO: Years should come from the frontend
        start_year = 2025
        end_year = 2027

        pd.set_option("display.max_columns", None)
        # Load cost data from CSV
        cost_csv_path = Path(__file__).parent.parent.parent / "cost.csv"
        cost_df = pd.read_csv(cost_csv_path)
        # print(cost_df.head())

        # Build population data from MetricType
        population_df = build_population_dataframe(self.request.user.iaso_profile.account)
        # print(population_df.head())

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

        # For now: just take everything from InterventionCostModel().assumptions
        settings = {
            "itn_campaign_divisor": 1.8,
            "itn_campaign_bale_size": 50,
            "itn_campaign_buffer_mult": 1.1,
            "itn_campaign_coverage": 1.0,
            "itn_routine_coverage": 0.3,
            "itn_routine_buffer_mult": 1.1,
            "iptp_anc_coverage": 0.8,
            "iptp_doses_per_pw": 3,
            "iptp_buffer_mult": 1.1,
            "smc_age_string": "0.18,0.77",  # proportion of population 3-11 months, 12-59 months
            "smc_pop_prop_3_11": 0.18,
            "smc_pop_prop_12_59": 0.77,
            "smc_coverage": 1.0,
            "smc_monthly_rounds": 4,
            "smc_buffer_mult": 1.1,
            "pmc_coverage": 0.85,
            "pmc_touchpoints": 4,
            "pmc_tablet_factor": 0.75,
            "pmc_buffer_mult": 1.1,
            "vacc_coverage": 0.84,
            "vacc_doses_per_child": 4,
            "vacc_buffer_mult": 1.1,
            "iptp_type": "SP",
            "smc_type": "SP+AQ",
            "pmc_type": "SP",
            "irs_type": "Sumishield",
            "lsm_type": "Bti",
            "vacc_type": "R21",
        }

        budgets = []

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
                )
            )

        print(budgets)

        return Response(budgets, status=status.HTTP_200_OK)
