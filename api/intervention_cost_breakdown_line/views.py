from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from iaso.api.common import DropdownOptionsWithRepresentationSerializer
from plugins.snt_malaria.models import InterventionCostBreakdownLine
from plugins.snt_malaria.models.cost_breakdown import InterventionCostUnitType

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
        return InterventionCostBreakdownLine.objects.select_related("intervention").filter(
            intervention__intervention_category__account=self.request.user.iaso_profile.account
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Get validated objects
        intervention = serializer.validated_data["intervention"]
        year = serializer.validated_data["year"]
        costs = serializer.validated_data["costs"]
        # Create InterventionAssignment objects
        with transaction.atomic():
            existing_costs = InterventionCostBreakdownLine.objects.filter(intervention=intervention, year=year)
            costs_with_id = {}
            costs_without_id = []
            for cost in costs:
                if "id" in cost and cost["id"] is not None:
                    costs_with_id[cost["id"]] = cost
                else:
                    costs_without_id.append(cost)
            for item in existing_costs:
                cost = costs_with_id.get(item.id, None)
                if cost:
                    item.name = cost["name"]
                    item.category = cost["category"]
                    item.unit_cost = cost["unit_cost"]
                    item.unit_type = cost["unit_type"]
                    item.intervention = intervention
                    item.year = year
                    item.updated_by = request.user
                    item.save()
                else:
                    item.delete()

            bulk_create_objs = [
                InterventionCostBreakdownLine(
                    name=cost["name"],
                    category=cost["category"],
                    unit_cost=cost["unit_cost"],
                    unit_type=cost["unit_type"],
                    intervention=intervention,
                    year=year,
                    created_by=request.user,
                )
                for cost in costs_without_id
            ]
            InterventionCostBreakdownLine.objects.bulk_create(bulk_create_objs)

        return Response(
            {"message": "intervention costs created successfully."},
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=False,
        methods=["get"],
    )
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
    def unit_types(self, _):
        serializer = DropdownOptionsWithRepresentationSerializer(
            InterventionCostUnitType.choices,
            many=True,
        )
        return Response(serializer.data, status=status.HTTP_200_OK)
