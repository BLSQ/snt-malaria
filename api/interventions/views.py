from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from plugins.snt_malaria.api.interventions.permissions import InterventionPermission
from plugins.snt_malaria.api.interventions.serializers import (
    InterventionDetailSerializer,
    InterventionDetailWriteSerializer,
    InterventionSerializer,
)
from plugins.snt_malaria.models import Intervention


class InterventionViewSet(viewsets.ModelViewSet):
    serializer_class = InterventionSerializer
    ordering_fields = ["id", "name"]
    http_method_names = ["get", "options", "put"]
    permission_classes = [InterventionPermission]

    def get_queryset(self):
        return Intervention.objects.filter(intervention_category__account=self.request.user.iaso_profile.account)

    @action(detail=True, methods=["get"], serializer_class=InterventionDetailSerializer)
    def details(self, request, pk):
        result = self.get_object()
        serializer = self.get_serializer(result)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["put"], serializer_class=InterventionDetailWriteSerializer)
    def update_details(self, request, pk):
        intervention = self.get_object()
        serializer = self.get_serializer(intervention, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(InterventionDetailSerializer(intervention).data, status=status.HTTP_200_OK)
