from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response

from iaso.api.apps import viewsets
from plugins.snt_malaria.api.budget_assumptions.filters import BudgetAssumptionsListFilter
from plugins.snt_malaria.api.budget_assumptions.permissions import BudgetAssumptionsPermission
from plugins.snt_malaria.api.budget_assumptions.serializers import (
    BudgetAssumptionsQuerySerializer,
    BudgetAssumptionsReadSerializer,
    BudgetAssumptionsUpsertManySerializer,
)
from plugins.snt_malaria.models import BudgetAssumptions


class BudgetAssumptionsViewSet(viewsets.ModelViewSet):
    http_method_names = ["get", "post"]
    filter_backends = [DjangoFilterBackend]
    filterset_class = BudgetAssumptionsListFilter
    permission_classes = [BudgetAssumptionsPermission]

    def get_serializer_class(self):
        if self.action == "many":
            return BudgetAssumptionsUpsertManySerializer
        return BudgetAssumptionsQuerySerializer

    def get_queryset(self):
        return BudgetAssumptions.objects.select_related("scenario", "intervention_assignment").filter(
            scenario__account=self.request.user.iaso_profile.account
        )

    def list(self, request, *args, **kwargs):
        query_serializer = BudgetAssumptionsQuerySerializer(
            data=request.query_params, context=self.get_serializer_context()
        )
        query_serializer.is_valid(raise_exception=True)
        scenario = query_serializer.validated_data["scenario"]
        year = query_serializer.validated_data.get("year")

        assumptions = self.get_queryset().filter(scenario_id=scenario.id)
        if year is not None:
            assumptions = assumptions.filter(year=year)

        serializer = BudgetAssumptionsReadSerializer(assumptions, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"])
    def many(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = serializer.save()
        response_serializer = BudgetAssumptionsReadSerializer(result, many=True)
        return Response(response_serializer.data, status=status.HTTP_200_OK)
