import django_filters

from plugins.snt_malaria.models import InterventionCostBreakdownLine


class InterventionCostBreakdownLineListFilter(django_filters.rest_framework.FilterSet):
    class Meta:
        model = InterventionCostBreakdownLine
        fields = ["intervention_id", "year"]
