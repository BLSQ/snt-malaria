from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status
from rest_framework.response import Response
from snt_malaria_budgeting import DEFAULT_COST_ASSUMPTIONS

from iaso.api.apps import viewsets
from plugins.snt_malaria.api.budget_settings_overrides.filters import BudgetSettingsOverridesListFilter
from plugins.snt_malaria.api.budget_settings_overrides.serializers import (
    BudgetSettingsOverridesListSerializer,
    BudgetSettingsOverridesWriteSerializer,
)
from plugins.snt_malaria.models.budget_settings_overrides import BudgetSettingsOverrides
from plugins.snt_malaria.models.intervention import Intervention


class BudgetSettingsOverridesViewSet(viewsets.ModelViewSet):
    http_method_names = ["get", "post", "put", "delete"]
    filter_backends = [DjangoFilterBackend]
    filterset_class = BudgetSettingsOverridesListFilter

    def get_serializer_class(self):
        print(self.action)
        if self.action == "create":
            return BudgetSettingsOverridesWriteSerializer
        return BudgetSettingsOverridesListSerializer

    def get_queryset(self):
        return BudgetSettingsOverrides.objects.prefetch_related("intervention__intervention_category__account").filter(
            intervention__intervention_category__account=self.request.user.iaso_profile.account
        )

    def list(self, request, *args, **kwargs):
        scenario_id = int(request.query_params.get("scenario_id", 0))
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        overrides = serializer.data
        interventions = Intervention.objects.prefetch_related("intervention_category__account").filter(
            intervention_category__account=self.request.user.iaso_profile.account
        )

        all_overrides = []
        for intervention in interventions:
            override = next((o for o in overrides or [] if o["intervention"] == intervention.id), None)
            if override:
                all_overrides.append(override)
                continue

            defaultBudget = {
                "id": None,
                "intervention": intervention.id,
                "scenario": scenario_id,
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

            all_overrides.append(defaultBudget)

        return Response(all_overrides, status=status.HTTP_200_OK)

    def _get_default_override(self, key, intervention_code):
        prefix = f"{intervention_code}_anc" if intervention_code == "iptp" and key == "coverage" else intervention_code
        return DEFAULT_COST_ASSUMPTIONS.get(f"{prefix}_{key}", 0)
