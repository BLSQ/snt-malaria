from rest_framework import status, viewsets
from rest_framework.response import Response

from plugins.snt_malaria.models import ScenarioRule

from .permissions import ScenarioRulePermission
from .serializers import (
    ScenarioRuleListSerializer,
    ScenarioRuleQuerySerializer,
    ScenarioRuleRetrieveSerializer,
)


class ScenarioRuleViewSet(viewsets.ModelViewSet):
    ordering_fields = ["scenario", "id"]
    http_method_names = ["get", "head", "options"]
    permission_classes = [ScenarioRulePermission]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated or not hasattr(user, "iaso_profile"):
            return ScenarioRule.objects.none()
        return ScenarioRule.objects.select_related("scenario").filter(scenario__account=user.iaso_profile.account)

    def get_serializer_class(self):
        if self.action == "list":
            return ScenarioRuleQuerySerializer
        if self.action == "retrieve":
            return ScenarioRuleRetrieveSerializer
        return None

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        scenario = serializer.validated_data["scenario"]

        scenario_rules = self.get_queryset().filter(scenario=scenario)
        serializer = ScenarioRuleListSerializer(scenario_rules, many=True)

        return Response(serializer.data, status=status.HTTP_200_OK)
