import django_filters

from plugins.snt_malaria.models.budget_assumptions import BudgetAssumptions


class BudgetAssumptionsListFilter(django_filters.rest_framework.FilterSet):
    scenario_id = django_filters.NumberFilter(field_name="scenario_id", lookup_expr="exact")

    class Meta:
        model = BudgetAssumptions
        fields = ["scenario_id"]
