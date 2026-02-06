import django_filters

from plugins.snt_malaria.models import InterventionCostBreakdownLine


class InterventionCostBreakdownLineListFilter(django_filters.rest_framework.FilterSet):
    scenario_id = django_filters.NumberFilter(field_name="intervention_id", lookup_expr="exact")

    class Meta:
        model = InterventionCostBreakdownLine
        fields = ["intervention_id", "year"]
