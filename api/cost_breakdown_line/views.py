from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.response import Response

from plugins.snt_malaria.models import CostBreakdownLine

from .filters import CostBreakdownLineListFilter
from .serializers import (
    CostBreakdownLineSerializer,
    CostBreakdownLinesWriteSerializer,
)


class CostBreakdownLineViewSet(viewsets.ModelViewSet):
    ordering_fields = ["id"]
    http_method_names = ["get", "options", "post"]
    filter_backends = [DjangoFilterBackend]
    filterset_class = CostBreakdownLineListFilter

    def get_serializer_class(self):
        if self.request.method == "POST":
            return CostBreakdownLinesWriteSerializer
        return CostBreakdownLineSerializer

    def get_queryset(self):
        return CostBreakdownLine.objects.prefetch_related("intervention").filter(
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
            CostBreakdownLine.objects.filter(intervention=intervention).delete()
            newCosts = [
                CostBreakdownLine(
                    name=item["name"],
                    cost=item["cost"],
                    category=item["category"],
                    intervention=intervention,
                    created_by=request.user,
                )
                for item in costs
            ]
            CostBreakdownLine.objects.bulk_create(newCosts)

        return Response(
            {"message": "intervention costs created successfully."},
            status=status.HTTP_201_CREATED,
        )
