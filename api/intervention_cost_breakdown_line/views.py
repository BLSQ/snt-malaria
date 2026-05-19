from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from iaso.api.common.serializer import DropdownOptionsWithRepresentationSerializer
from plugins.snt_malaria.models import InterventionCostBreakdownLine
from plugins.snt_malaria.models.cost_breakdown import CostUnitType

from .filters import InterventionCostBreakdownLineListFilter
from .permissions import InterventionCostBreakdownLinePermission
from .serializers import (
    InterventionCostBreakdownLineSerializer,
    InterventionCostBreakdownLinesWriteSerializer,
)


class InterventionCostBreakdownLineViewSet(viewsets.ModelViewSet):
    ordering_fields = ["id"]
    http_method_names = ["get", "options", "post"]
    filter_backends = [DjangoFilterBackend]
    filterset_class = InterventionCostBreakdownLineListFilter
    permission_classes = [InterventionCostBreakdownLinePermission]

    def get_serializer_class(self):
        if self.action == "create":
            return InterventionCostBreakdownLinesWriteSerializer
        return InterventionCostBreakdownLineSerializer

    def get_queryset(self):
        return (
            InterventionCostBreakdownLine.objects.select_related("intervention", "unit_type")
            .filter(intervention__intervention_category__account=self.request.user.iaso_profile.account)
            .order_by("id")
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        intervention = serializer.validated_data["intervention"]
        costs = serializer.validated_data["costs"]

        with transaction.atomic():
            existing_costs = InterventionCostBreakdownLine.objects.filter(intervention=intervention)
            existing_costs.delete()
            new_costs = []
            for cost in costs:
                new_cost = InterventionCostBreakdownLine(
                    name=cost["name"],
                    category=cost["category"],
                    unit_cost=cost["unit_cost"],
                    unit_type=cost["unit_type"],
                    intervention=intervention,
                    created_by=request.user,
                )
                new_costs.append(new_cost)
            InterventionCostBreakdownLine.objects.bulk_create(new_costs)

        return Response(
            {"message": "intervention costs created successfully."},
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def categories(self, _):
        serializer = DropdownOptionsWithRepresentationSerializer(
            InterventionCostBreakdownLine.InterventionCostBreakdownLineCategory.choices,
            many=True,
        )
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(
        detail=False,
        methods=["get"],
    )
    def unit_types_dropdown(self, _):
        from iaso.api.common.serializer import DropdownOptionsSerializer

        account = self.request.user.iaso_profile.account
        queryset = CostUnitType.objects.filter(account=account)

        data = [{"value": str(unit_type.id), "label": unit_type.name} for unit_type in queryset]
        serializer = DropdownOptionsSerializer(data, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
