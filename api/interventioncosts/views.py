from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.response import Response

from plugins.snt_malaria.models import InterventionCost

from .filters import InterventionCostListFilter
from .serializers import (
    InterventionCostSerializer,
    InterventionCostWriteSerializer,
)


class InterventionCostsViewSet(viewsets.ModelViewSet):
    ordering_fields = ["id"]
    http_method_names = ["get", "options", "post"]
    filter_backends = [DjangoFilterBackend]
    filterset_class = InterventionCostListFilter

    def get_serializer_class(self):
        if self.request.method == "POST":
            return InterventionCostWriteSerializer
        return InterventionCostSerializer

    def get_queryset(self):
        return InterventionCost.objects.prefetch_related("intervention").filter(
            intervention__intervention_category__account=self.request.user.iaso_profile.account
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        print(f"{serializer.validated_data}")

        # Get validated objects
        intervention = serializer.validated_data["intervention"]
        costs = serializer.validated_data["costs"]
        cost_categories = serializer.validated_data["cost_categories"]
        print(cost_categories)
        cost_categories_dict = {value.id: value for _, value in enumerate(cost_categories)}
        print(f"{costs}")

        # Create InterventionAssignment objects
        with transaction.atomic():
            InterventionCost.objects.filter(intervention=intervention).delete()
            newCosts = [
                InterventionCost(
                    name=item["name"],
                    cost=item["cost"],
                    category=cost_categories_dict[item["category_id"]],
                    intervention=intervention,
                    id=item["id"] if item["id"] > 0 else None,
                    created_by=request.user,
                )
                for item in costs
            ]
            InterventionCost.objects.bulk_create(newCosts)

        return Response(
            {"message": "intervention costs created successfully."},
            status=status.HTTP_201_CREATED,
        )
