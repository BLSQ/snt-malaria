from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets

from plugins.snt_malaria.api.interventionMixes.filters import InterventionMixListFilter
from plugins.snt_malaria.api.interventionMixes.serializers import InterventionMixSerializer
from plugins.snt_malaria.models.intervention import InterventionMix


class InterventionMixViewSet(viewsets.ModelViewSet):
    serializer_class = InterventionMixSerializer
    ordering_fields = ["id", "name"]
    http_method_names = ["get", "options"]
    filter_backends = [DjangoFilterBackend]
    filterset_class = InterventionMixListFilter

    def get_queryset(self):
        return InterventionMix.objects.prefetch_related("interventions").filter(
            account=self.request.user.iaso_profile.account
        )
