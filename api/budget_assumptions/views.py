from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status
from rest_framework.response import Response
from snt_malaria_budgeting import DEFAULT_COST_ASSUMPTIONS

from iaso.api.apps import viewsets
from plugins.snt_malaria.api.budget_assumptions.filters import BudgetAssumptionsListFilter
from plugins.snt_malaria.api.budget_assumptions.permissions import BudgetAssumptionsPermission
from plugins.snt_malaria.api.budget_assumptions.serializers import (
    BudgetAssumptionsCreateSerializer,
    BudgetAssumptionsQuerySerializer,
    BudgetAssumptionsReadSerializer,
    BudgetAssumptionsUpdateSerializer,
)
from plugins.snt_malaria.models import BudgetAssumptions, Intervention


class BudgetAssumptionsViewSet(viewsets.ModelViewSet):
    http_method_names = ["get", "post", "put"]
    filter_backends = [DjangoFilterBackend]
    filterset_class = BudgetAssumptionsListFilter
    permission_classes = [BudgetAssumptionsPermission]

    def get_serializer_class(self):
        if self.action == "create":
            return BudgetAssumptionsCreateSerializer
        if self.action == "update":
            return BudgetAssumptionsUpdateSerializer
        return BudgetAssumptionsQuerySerializer

    def get_queryset(self):
        return BudgetAssumptions.objects.prefetch_related("scenario").filter(
            scenario__account=self.request.user.iaso_profile.account
        )

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        scenario = serializer.validated_data["scenario"]

        assumptions = self.get_queryset().filter(scenario_id=scenario.id)
        interventions = (
            Intervention.objects.prefetch_related("intervention_category__account")
            .filter(intervention_category__account=self.request.user.iaso_profile.account)
            .order_by("code")
            .distinct("code")
            .values("code")
        )

        all_assumptions = []
        intervention_assumption_map = {a.intervention_code: a for a in assumptions}
        for intervention_code in [i["code"] for i in interventions]:
            assumption = intervention_assumption_map.get(intervention_code)

            if assumption:
                all_assumptions.append(assumption)
                continue

            default_budget = {
                "id": None,
                "intervention_code": intervention_code,
                "scenario": scenario,
                "coverage": self._get_default_override("coverage", intervention_code),
                "divisor": self._get_default_override("divisor", intervention_code),
                "bale_size": self._get_default_override("bale_size", intervention_code),
                "buffer_mult": self._get_default_override("buffer_mult", intervention_code),
                "coverage": self._get_default_override("coverage", intervention_code),
                "doses_per_pw": self._get_default_override("doses_per_pw", intervention_code),
                "age_string": self._get_default_override("age_string", intervention_code),
                "pop_prop_3_11": self._get_default_override("pop_prop_3_11", intervention_code),
                "pop_prop_12_59": self._get_default_override("pop_prop_12_59", intervention_code),
                "monthly_rounds": self._get_default_override("monthly_rounds", intervention_code),
                "touchpoints": self._get_default_override("touchpoints", intervention_code),
                "tablet_factor": self._get_default_override("tablet_factor", intervention_code),
                "doses_per_child": self._get_default_override("doses_per_child", intervention_code),
            }

            all_assumptions.append(default_budget)

        assumptions_serializer = BudgetAssumptionsReadSerializer(all_assumptions, many=True)

        return Response(assumptions_serializer.data, status=status.HTTP_200_OK)

    def _get_default_override(self, key, intervention_code):
        prefix = f"{intervention_code}_anc" if intervention_code == "iptp" and key == "coverage" else intervention_code
        return DEFAULT_COST_ASSUMPTIONS.get(f"{prefix}_{key}", 0)
