from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from snt_malaria_budgeting import DEFAULT_COST_ASSUMPTIONS

from iaso.api.apps import viewsets
from plugins.snt_malaria.api.budget_settings_overrides.filters import BudgetSettingsOverridesListFilter
from plugins.snt_malaria.api.budget_settings_overrides.serializers import BudgetSettingsOverridesListSerializer
from plugins.snt_malaria.models.budget_settings_overrides import BudgetSettingsOverrides
from plugins.snt_malaria.models.intervention import Intervention


class BudgetSettingsOverridesViewSet(viewsets.ModelViewSet):
    http_method_names = ["get", "post", "delete"]
    filter_backends = [DjangoFilterBackend]
    filterset_class = BudgetSettingsOverridesListFilter
    serializer_class = BudgetSettingsOverridesListSerializer

    def get_queryset(self):
        return BudgetSettingsOverrides.objects.prefetch_related("intervention__intervention_category__account").filter(
            intervention__intervention_category__account=self.request.user.iaso_profile.account
        )

    def list(self, _request):
        # TODO Filter this by scenario id
        overrides = self.get_queryset()

        interventions = Intervention.objects.prefetch_related("intervention_category__account").filter(
            intervention_category__account=self.request.user.iaso_profile.account
        )

        all_overrides = []
        # TODO Move this to a serializer
        for intervention in interventions:
            override = next((o for o in overrides or [] if o.intervention.id == intervention.id), None)
            defaultBudget = {
                "intervention_id": intervention.id,
                "intervention_code": intervention.code,
                "intervention_name": intervention.name,
                "coverage": self._get_override(override, "coverage", intervention.code),
                "divisor": self._get_override(override, "divisor", intervention.code),
                "bale_size": self._get_override(override, "bale_size", intervention.code),
                "buffer_mult": self._get_override(override, "buffer_mult", intervention.code),
                "coverage": self._get_override(override, "coverage", intervention.code),
                "doses_per_pw": self._get_override(override, "doses_per_pw", intervention.code),
                "age_string": self._get_override(override, "age_string", intervention.code),
                "pop_prop_3_11": self._get_override(override, "pop_prop_3_11", intervention.code),
                "pop_prop_12_59": self._get_override(override, "pop_prop_12_59", intervention.code),
                "monthly_rounds": self._get_override(override, "monthly_rounds", intervention.code),
                "touchpoints": self._get_override(override, "touchpoints", intervention.code),
                "tablet_factor": self._get_override(override, "tablet_factor", intervention.code),
                "doses_per_child": self._get_override(override, "doses_per_child", intervention.code),
            }

            all_overrides.append(defaultBudget)

        return Response(all_overrides, status=status.HTTP_200_OK)

    def _get_override(self, override: BudgetSettingsOverrides, key, intervention_code):
        prefix = f"{intervention_code}_anc" if intervention_code == "iptp" and key == "coverage" else intervention_code
        return getattr(override, key) if override else DEFAULT_COST_ASSUMPTIONS.get(f"{prefix}_{key}", 0)
