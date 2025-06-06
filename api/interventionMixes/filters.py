import django_filters

from plugins.snt_malaria.models.intervention import InterventionMix


class InterventionMixListFilter(django_filters.rest_framework.FilterSet):
    scenario_id = django_filters.NumberFilter(field_name="scenario_id", lookup_expr="exact")

    class Meta:
        model = InterventionMix
        fields = ["scenario_id"]
