from plugins.snt_malaria.api.interventions.serializers import (
    InterventionFamilySerializer,
)
from plugins.snt_malaria.models import InterventionFamily
from rest_framework import viewsets


class InterventionViewSet(viewsets.ModelViewSet):
    serializer_class = InterventionFamilySerializer
    ordering_fields = ["id", "name"]
    http_method_names = ["get", "options"]

    def get_queryset(self):
        return InterventionFamily.objects.filter(
            account=self.request.user.iaso_profile.account
        )
