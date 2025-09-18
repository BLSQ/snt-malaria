import django_filters

from plugins.snt_malaria.models import CostBreakdownLine


class CostBreakdownLineListFilter(django_filters.rest_framework.FilterSet):
    scenario_id = django_filters.NumberFilter(field_name="intervention_id", lookup_expr="exact")

    class Meta:
        model = CostBreakdownLine
        fields = ["intervention_id"]
