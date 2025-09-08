from rest_framework import viewsets

from plugins.snt_malaria.api.interventions.serializers import InterventionSerializer
from plugins.snt_malaria.models import Intervention


class InterventionViewSet(viewsets.ModelViewSet):
    serializer_class = InterventionSerializer
    ordering_fields = ["id", "name"]
    http_method_names = ["get", "put", "options"]

    def get_queryset(self):
        return Intervention.objects.filter(intervention_category__account=self.request.user.iaso_profile.account)
