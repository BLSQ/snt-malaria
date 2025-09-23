from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from plugins.snt_malaria.models import InterventionCostBreakdownLine

from .filters import InterventionCostBreakdownLineListFilter
from .serializers import (
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
            existingCosts = InterventionCostBreakdownLine.objects.filter(intervention=intervention)
            for item in existingCosts:
                cost = next((c for c in costs if c.get("id", -1) == item.id), None)
                if cost:
                    InterventionCostBreakdownLine.objects.update(
                        name=cost["name"],
                        unit_cost=cost["unit_cost"],
                        category=cost["category"],
                        intervention=intervention,
                        id=cost["id"],
                    )
                    costs = costs.exclude(id=cost["id"])
                else:
                    item.delete()

            bulk_create_objs = [
                InterventionCostBreakdownLine(
                    name=cost["name"],
                    unit_cost=cost["unit_cost"],
                    category=cost["category"],
                    intervention=intervention,
                )
                for cost in costs
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
        return Response(
            [
                {"value": choice.value, "label": str(choice.label)}
                for choice in InterventionCostBreakdownLine.InterventionCostBreakdownLineCategory
            ]
        )
