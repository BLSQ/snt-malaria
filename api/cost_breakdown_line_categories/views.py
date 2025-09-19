from rest_framework import viewsets

from plugins.snt_malaria.api.cost_breakdown_line_categories.serializers import (
    CostBreakdownLineCategorySerializer,
)
from plugins.snt_malaria.models import CostBreakdownLineCategory


class CostBreakdownLineCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CostBreakdownLineCategorySerializer
    ordering_fields = ["id", "name"]
    http_method_names = ["get", "options"]

    def get_queryset(self):
        return CostBreakdownLineCategory.objects.filter(account=self.request.user.iaso_profile.account)
