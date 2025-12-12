from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status
from rest_framework.response import Response
from snt_malaria_budgeting import DEFAULT_COST_ASSUMPTIONS

from iaso.api.apps import viewsets
from plugins.snt_malaria.api.budget_assumptions.filters import BudgetAssumptionsListFilter
from plugins.snt_malaria.api.budget_assumptions.serializers import (
    BudgetAssumptionsQuerySerializer,
    BudgetAssumptionsSerializer,
    BudgetAssumptionsWriteSerializer,
)
from plugins.snt_malaria.models import BudgetAssumptions, Intervention


class BudgetAssumptionsViewSet(viewsets.ModelViewSet):
    http_method_names = ["get", "post", "put", "delete"]
    filter_backends = [DjangoFilterBackend]
    filterset_class = BudgetAssumptionsListFilter

    def get_serializer_class(self):
        if self.action == "create" or self.action == "update":
            return BudgetAssumptionsWriteSerializer
        return BudgetAssumptionsQuerySerializer

    def get_queryset(self):
        return BudgetAssumptions.objects.prefetch_related("intervention__intervention_category__account").filter(
            intervention__intervention_category__account=self.request.user.iaso_profile.account
        )

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        scenario = serializer.validated_data["scenario"]

        assumptions = self.get_queryset().filter(scenario__id=scenario.id)
        interventions = Intervention.objects.prefetch_related("intervention_category__account").filter(
            intervention_category__account=self.request.user.iaso_profile.account
        )

        all_assumptions = []
        intervention_assumption_map = {a.intervention.id: a for a in assumptions}
        for intervention in interventions:
            assumption = intervention_assumption_map.get(intervention.id)
            
            if assumption:
                all_assumptions.append(assumption)
                continue

            defaultBudget = {
                "id": None,
                "intervention": intervention,
                "scenario": scenario,
                "coverage": self._get_default_override("coverage", intervention.code),
                "divisor": self._get_default_override("divisor", intervention.code),
                "bale_size": self._get_default_override("bale_size", intervention.code),
                "buffer_mult": self._get_default_override("buffer_mult", intervention.code),
                "coverage": self._get_default_override("coverage", intervention.code),
                "doses_per_pw": self._get_default_override("doses_per_pw", intervention.code),
                "age_string": self._get_default_override("age_string", intervention.code),
                "pop_prop_3_11": self._get_default_override("pop_prop_3_11", intervention.code),
                "pop_prop_12_59": self._get_default_override("pop_prop_12_59", intervention.code),
                "monthly_rounds": self._get_default_override("monthly_rounds", intervention.code),
                "touchpoints": self._get_default_override("touchpoints", intervention.code),
                "tablet_factor": self._get_default_override("tablet_factor", intervention.code),
                "doses_per_child": self._get_default_override("doses_per_child", intervention.code),
            }

            all_assumptions.append(defaultBudget)

        assumptionsSerializer = BudgetAssumptionsSerializer(all_assumptions, many=True)

        return Response(assumptionsSerializer.data, status=status.HTTP_200_OK)

    def _get_default_override(self, key, intervention_code):
        prefix = f"{intervention_code}_anc" if intervention_code == "iptp" and key == "coverage" else intervention_code
        return DEFAULT_COST_ASSUMPTIONS.get(f"{prefix}_{key}", 0)
