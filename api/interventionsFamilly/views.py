from rest_framework import viewsets
from plugins.snt_malaria.api.interventionsFamilly.serializers import (
    InterventionFamilySerializer,
)
from plugins.snt_malaria.models import InterventionFamily


class InterventionsFamillyViewSet(viewsets.ModelViewSet):
    serializer_class = InterventionFamilySerializer
    ordering_fields = ["id", "name"]
    http_method_names = ["get", "options"]

    def get_queryset(self):
        return InterventionFamily.objects.filter(
            account=self.request.user.iaso_profile.account
        )
