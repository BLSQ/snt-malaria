from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from plugins.snt_malaria.api.budget.filters import BudgetListFilter
from plugins.snt_malaria.api.budget.permissions import BudgetPermission
from plugins.snt_malaria.api.budget.serializers import (
    BudgetCreateSerializer,
    BudgetSerializer,
)
from plugins.snt_malaria.models.budget import Budget
from plugins.snt_malaria.services import BudgetCalculationService


class BudgetViewSet(viewsets.ModelViewSet):
    ordering_fields = ["id", "name"]
    http_method_names = ["get", "options", "post"]
    serializer_class = BudgetSerializer
    filterset_class = BudgetListFilter
    permission_classes = [BudgetPermission]

    def get_queryset(self):
        return Budget.objects.select_related("scenario").filter(
            scenario__account=self.request.user.iaso_profile.account
        )

    @action(detail=False, methods=["get"])
    def get_latest(self, _request):
        queryset = self.filter_queryset(self.get_queryset())
        budget = queryset.order_by("-created_at").first()
        if not budget:
            return Response({"detail": "No budget found"}, status=status.HTTP_404_NOT_FOUND)
        serializer = BudgetSerializer(budget)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def get_serializer_class(self):
        if self.action == "create":
            return BudgetCreateSerializer
        return BudgetSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        scenario = serializer.validated_data["scenario"]

        budget_service = BudgetCalculationService(scenario)
        budget = budget_service.calculate_and_save_all_years(request.user)

        # Return the created budget using the display serializer
        output_serializer = BudgetSerializer(budget)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)
