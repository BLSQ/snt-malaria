from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from plugins.snt_malaria.api.interventions.serializers import InterventionSerializer, InterventionUnitTypeSerializer
from plugins.snt_malaria.models import Intervention


class InterventionViewSet(viewsets.ModelViewSet):
    serializer_class = InterventionSerializer
    ordering_fields = ["id", "name"]
    http_method_names = ["get", "put", "options"]

    def get_queryset(self):
        return Intervention.objects.filter(intervention_category__account=self.request.user.iaso_profile.account)

    @action(
        detail=False,
        methods=["get"],
    )
    def unit_types(self, _):
        serializer = InterventionUnitTypeSerializer(
            Intervention.InterventionUnitType.choices,
            many=True,
        )
        return Response(serializer.data, status=status.HTTP_200_OK)
