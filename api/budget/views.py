from rest_framework import viewsets

from plugins.snt_malaria.api.budget.filters import BudgetListFilter
from plugins.snt_malaria.api.budget.serializers import BudgetSerializer
from plugins.snt_malaria.models.budget import Budget


class BudgetViewSet(viewsets.ModelViewSet):
    ordering_fields = ["id", "name"]
    http_method_names = ["get", "options", "post"]
    serializer_class = BudgetSerializer
    filterset_class = BudgetListFilter

    def get_queryset(self):
        return Budget.objects.select_related("scenario").filter(
            scenario__account=self.request.user.iaso_profile.account
        )
