from rest_framework import viewsets

from plugins.snt_malaria.api.interventioncostcategories.serializers import (
    InterventionCostCategorySerializer,
)
from plugins.snt_malaria.models import InterventionCostCategory


class InterventionCostCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = InterventionCostCategorySerializer
    ordering_fields = ["id", "name"]
    http_method_names = ["get", "options"]

    def get_queryset(self):
        return InterventionCostCategory.objects.filter(account=self.request.user.iaso_profile.account)
