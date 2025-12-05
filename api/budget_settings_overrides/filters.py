import django_filters

from plugins.snt_malaria.models.budget_settings_overrides import BudgetSettingsOverrides


class BudgetSettingsOverridesListFilter(django_filters.rest_framework.FilterSet):
    scenario_id = django_filters.NumberFilter(field_name="scenario_id", lookup_expr="exact")

    class Meta:
        model = BudgetSettingsOverrides
        fields = "__all__"
