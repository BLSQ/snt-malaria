from django_filters import NumberFilter
from django_filters.rest_framework import FilterSet

from plugins.snt_malaria.models.budget import Budget


class BudgetListFilter(FilterSet):
    scenario_id = NumberFilter(field_name="scenario_id", lookup_expr="exact")

    class Meta:
        model = Budget
        fields = ["scenario_id"]
