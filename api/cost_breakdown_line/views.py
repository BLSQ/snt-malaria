from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from plugins.snt_malaria.models import InterventionCostBreakdownLine
from plugins.snt_malaria.models.cost_breakdown import InterventionCostUnitType

from .filters import InterventionCostBreakdownLineListFilter
from .serializers import (
    DropdownOptionsWithRepresentationSerializer,
    InterventionCostBreakdownLineSerializer,
    InterventionCostBreakdownLinesWriteSerializer,
)


class InterventionCostBreakdownLineViewSet(viewsets.ModelViewSet):
    ordering_fields = ["id"]
    http_method_names = ["get", "options", "post"]
    filter_backends = [DjangoFilterBackend]
    filterset_class = InterventionCostBreakdownLineListFilter

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
        costs = serializer.validated_data["costs"]
        # Create InterventionAssignment objects
        with transaction.atomic():
            existing_costs = InterventionCostBreakdownLine.objects.filter(intervention=intervention)
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
                    item.unit_cost = cost["unit_cost"]
                    item.category = cost["category"]
                    item.intervention = intervention
                    item.updated_by = request.user
                    item.year = cost["year"]
                    item.unit_type = cost["unit_type"]
                    item.save()
                else:
                    item.delete()

            bulk_create_objs = [
                InterventionCostBreakdownLine(
                    name=cost["name"],
                    unit_cost=cost["unit_cost"],
                    unit_type=cost["unit_type"],
                    category=cost["category"],
                    intervention=intervention,
                    created_by=request.user,
                    year=cost["year"],
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
