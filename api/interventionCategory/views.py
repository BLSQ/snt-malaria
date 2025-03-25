from rest_framework import viewsets

from plugins.snt_malaria.api.interventionCategory.serializers import (
    InterventionCategorySerializer,
)
from plugins.snt_malaria.models import InterventionCategory


class InterventionCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = InterventionCategorySerializer
    ordering_fields = ["id", "name"]
    http_method_names = ["get", "options"]

    def get_queryset(self):
        return InterventionCategory.objects.filter(account=self.request.user.iaso_profile.account)
