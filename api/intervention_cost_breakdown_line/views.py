from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from iaso.api.common.serializer import DropdownOptionsWithRepresentationSerializer
from plugins.snt_malaria.models import InterventionCostBreakdownLine
from plugins.snt_malaria.models.cost_unit_type import CostUnitType

from .filters import InterventionCostBreakdownLineListFilter
from .permissions import InterventionCostBreakdownLinePermission
from .serializers import (
    InterventionCostBreakdownLineSerializer,
    InterventionCostBreakdownLineSingleWriteSerializer,
    UnitTypeDropdownSerializer,
)


class InterventionCostBreakdownLineViewSet(viewsets.ModelViewSet):
    ordering_fields = ["id"]
    http_method_names = ["get", "post", "patch", "delete", "options"]
    filter_backends = [DjangoFilterBackend]
    filterset_class = InterventionCostBreakdownLineListFilter
    permission_classes = [InterventionCostBreakdownLinePermission]
    serializer_class = InterventionCostBreakdownLineSerializer

    def get_serializer_class(self):
        if self.action in ("create", "partial_update"):
            return InterventionCostBreakdownLineSingleWriteSerializer
        return InterventionCostBreakdownLineSerializer

    def get_queryset(self):
        return (
            InterventionCostBreakdownLine.objects.select_related("intervention", "unit_type", "population_layer")
            .filter(intervention__intervention_category__account=self.request.user.iaso_profile.account)
            .order_by("id")
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        line = serializer.save(created_by=request.user, updated_by=request.user)
        return Response(InterventionCostBreakdownLineSerializer(line).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        line = self.get_object()
        serializer = self.get_serializer(line, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        line = serializer.save(updated_by=request.user)
        return Response(InterventionCostBreakdownLineSerializer(line).data, status=status.HTTP_200_OK)

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
        account = self.request.user.iaso_profile.account
        queryset = CostUnitType.objects.filter(account=account)

        data = [
            {
                "value": str(unit_type.id),
                "label": unit_type.name,
            }
            for unit_type in queryset
        ]
        serializer = UnitTypeDropdownSerializer(data, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
