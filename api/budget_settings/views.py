from rest_framework import viewsets

from plugins.snt_malaria.api.budget_settings.serializers import BudgetSettingsSerializer
from plugins.snt_malaria.models.budget_settings import BudgetSettings


class BudgetSettingsViewSet(viewsets.ModelViewSet):
    ordering_fields = ["id"]
    http_method_names = ["get", "options", "post"]
    serializer_class = BudgetSettingsSerializer
    queryset = BudgetSettings.objects.all

    def get_queryset(self):
        return BudgetSettings.objects.filter(account=self.request.user.iaso_profile.account)
