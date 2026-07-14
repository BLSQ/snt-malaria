import logging

import anthropic

from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.response import Response

from iaso.models import MetricType
from plugins.snt_malaria.api.composite_layers.permissions import CompositeLayerPermission

from .agent import generate_composite_layer_graph
from .serializers import (
    CompositeLayerAIRequestSerializer,
    CompositeLayerAIResponseSerializer,
)


logger = logging.getLogger(__name__)


@extend_schema(tags=["SNT Malaria"])
class CompositeLayerAIViewSet(viewsets.ViewSet):
    """AI-powered composite layer generation.

    Send a natural language message describing the desired composite data layer. Returns a
    generated node graph spec (dataLayer/formula/classify nodes plus an output) that the frontend
    converts into Flume graph nodes for the composite layer editor.
    """

    permission_classes = [CompositeLayerPermission]

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

        account = request.user.iaso_profile.account
        api_key = account.anthropic_api_key or None
        if not api_key:
            return Response(
                {
                    "error": "Composite Layer AI API key is not configured for this account. Please contact your administrator."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        metric_types = list(
            MetricType.objects.filter(account=account, is_utility=False).values("id", "name", "description")
        )

        try:
            result = generate_composite_layer_graph(
                message,
                conversation_history,
                metric_types,
                api_key=api_key,
                current_graph=current_graph,
            )
            return Response(result, status=status.HTTP_200_OK)
        except anthropic.APIStatusError as e:
            if e.status_code == 503:
                logger.warning("Claude API returned 503")
                return Response(
                    {"error": "The AI service is temporarily unavailable. Please try again later."},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
            logger.exception("Composite Layer AI error")
            return Response(
                {"error": "Failed to generate composite layer. Please try again."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception:
            logger.exception("Composite Layer AI error")
            return Response(
                {"error": "Failed to generate composite layer. Please try again."},
                status=status.HTTP_400_BAD_REQUEST,
            )
