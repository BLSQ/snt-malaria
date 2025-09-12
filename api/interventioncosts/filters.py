import django_filters

from plugins.snt_malaria.models import InterventionCost


class InterventionCostListFilter(django_filters.rest_framework.FilterSet):
    scenario_id = django_filters.NumberFilter(field_name="intervention_id", lookup_expr="exact")

    class Meta:
        model = InterventionCost
        fields = ["intervention_id"]
