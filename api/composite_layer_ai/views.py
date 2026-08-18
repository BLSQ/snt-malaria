import logging

from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.response import Response

from iaso.models import MetricType, MetricValue
from plugins.snt_malaria.api.ai_chat.mixins import AIChatAttachmentViewSetMixin
from plugins.snt_malaria.api.composite_layers.permissions import CompositeLayerPermission
from plugins.snt_malaria.models.account_settings import get_intervention_org_units
from plugins.snt_malaria.services.ai_chat import classify_anthropic_error

from .agent import generate_composite_layer_graph
from .serializers import CompositeLayerAIRequestSerializer, CompositeLayerAIResponseSerializer


logger = logging.getLogger(__name__)


@extend_schema(tags=["SNT Malaria"])
class CompositeLayerAIViewSet(AIChatAttachmentViewSetMixin, viewsets.ViewSet):
    """AI-powered composite layer generation.

    Send a natural language message describing the desired composite data layer. Returns a
    generated node graph spec (dataLayer/formula/classify nodes plus an output) that the frontend
    converts into Flume graph nodes for the composite layer editor.
    """

    permission_classes = [CompositeLayerPermission]
    API_KEY_MISSING_ERROR = (
        "Composite Layer AI API key is not configured for this account. Please contact your administrator."
    )

    @extend_schema(
        request=CompositeLayerAIRequestSerializer,
        responses={200: CompositeLayerAIResponseSerializer},
    )
    def create(self, request):
        serializer = CompositeLayerAIRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        message = serializer.validated_data["message"]
        conversation_history = serializer.validated_data.get("conversation_history", [])
        current_graph = serializer.validated_data.get("current_graph")
        attachments = serializer.validated_data.get("attachments", [])

        account = request.user.iaso_profile.account
        api_key = self._get_api_key(request)
        if not api_key:
            return Response({"error": self.API_KEY_MISSING_ERROR}, status=status.HTTP_400_BAD_REQUEST)

        metric_types = list(
            MetricType.objects.filter(account=account, is_utility=False).values("id", "name", "description")
        )

        # Which years each layer has data for (never the values themselves), so the prompt can
        # offer the model real years to pin a `dataLayer` node to instead of it guessing one.
        years_by_metric_type: dict[int, list[int]] = {}
        year_rows = (
            MetricValue.objects.filter(
                metric_type_id__in=[metric_type["id"] for metric_type in metric_types], year__isnull=False
            )
            .values_list("metric_type_id", "year")
            .distinct()
        )
        for metric_type_id, year in year_rows:
            years_by_metric_type.setdefault(metric_type_id, []).append(year)
        for metric_type in metric_types:
            years = years_by_metric_type.get(metric_type["id"])
            if years:
                metric_type["years"] = sorted(years, reverse=True)

        org_units = list(get_intervention_org_units(account).values("id", "name").order_by("name"))

        try:
            result = generate_composite_layer_graph(
                message,
                conversation_history,
                metric_types,
                org_units,
                api_key=api_key,
                current_graph=current_graph,
                attachments=attachments,
            )
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            status_code, body = classify_anthropic_error(
                e, generic_message="Failed to generate composite layer. Please try again.", logger=logger
            )
            return Response(body, status=status_code)
