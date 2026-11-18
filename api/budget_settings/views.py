from rest_framework import viewsets

from plugins.snt_malaria.api.budget_settings.permissions import BudgetSettingsPermission
from plugins.snt_malaria.api.budget_settings.serializers import BudgetSettingsSerializer
from plugins.snt_malaria.api.workspace_scoped import WorkspaceScopedViewSetMixin
from plugins.snt_malaria.models.budget_settings import BudgetSettings


class BudgetSettingsViewSet(WorkspaceScopedViewSetMixin, viewsets.ModelViewSet):
    ordering_fields = ["id"]
    http_method_names = ["get", "patch", "head", "options"]
    serializer_class = BudgetSettingsSerializer
    queryset = BudgetSettings.objects.all()
    permission_classes = [BudgetSettingsPermission]
