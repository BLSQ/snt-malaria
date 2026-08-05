import logging

import anthropic

from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from iaso.models import MetricType, MetricValue
from iaso.utils.virus_scan.clamav import scan_uploaded_file_for_virus
from iaso.utils.virus_scan.model import VirusScanStatus
from plugins.snt_malaria.api.composite_layers.permissions import CompositeLayerPermission
from plugins.snt_malaria.models.account_settings import get_intervention_org_units

from .agent import generate_composite_layer_graph
from .serializers import (
    ALLOWED_ATTACHMENT_CONTENT_TYPE,
    AttachmentUploadResponseSerializer,
    AttachmentUploadSerializer,
    CompositeLayerAIRequestSerializer,
    CompositeLayerAIResponseSerializer,
)


logger = logging.getLogger(__name__)

API_KEY_MISSING_ERROR = (
    "Composite Layer AI API key is not configured for this account. Please contact your administrator."
)


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
        attachments = serializer.validated_data.get("attachments", [])

        account = request.user.iaso_profile.account
        api_key = self._get_api_key(account)
        if not api_key:
            return Response({"error": API_KEY_MISSING_ERROR}, status=status.HTTP_400_BAD_REQUEST)

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
        except anthropic.APIStatusError as e:
            if e.status_code == 503:
                logger.warning("Claude API returned 503")
                return Response(
                    {"error": "The AI service is temporarily unavailable. Please try again later."},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
            if e.status_code == 400:
                # A persistent configuration problem (e.g. an invalid/out-of-credit API key) rather
                # than a transient failure - "try again" would be misleading. The account's Anthropic
                # key is an admin-level config the end user has no visibility or control over, so log
                # Anthropic's own detail for an admin to diagnose, but never show it to the user.
                logger.error("Claude API rejected the request: %s", e)
                return Response(
                    {"error": "The AI service rejected this request. Please contact your administrator."},
                    status=status.HTTP_400_BAD_REQUEST,
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

    def _get_api_key(self, account):
        return account.anthropic_api_key or None

    @action(detail=False, methods=["post"], url_path="attachments")
    def upload_attachment(self, request):
        # Proxied straight to the Anthropic Files API, never stored locally.
        serializer = AttachmentUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        uploaded_file = serializer.validated_data["file"]

        api_key = self._get_api_key(request.user.iaso_profile.account)
        if not api_key:
            return Response({"error": API_KEY_MISSING_ERROR}, status=status.HTTP_400_BAD_REQUEST)

        scan_result, _ = scan_uploaded_file_for_virus(uploaded_file)
        if scan_result in (VirusScanStatus.INFECTED, VirusScanStatus.ERROR):
            return Response(
                {"error": "This file could not be verified as safe and was not attached."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            client = anthropic.Anthropic(api_key=api_key)
            uploaded = client.beta.files.upload(
                file=(uploaded_file.name, uploaded_file, ALLOWED_ATTACHMENT_CONTENT_TYPE),
                betas=["files-api-2025-04-14"],
            )
        except anthropic.APIError:
            logger.exception("Composite Layer AI attachment upload error")
            return Response(
                {"error": "Failed to upload the attachment. Please try again."}, status=status.HTTP_400_BAD_REQUEST
            )

        response_serializer = AttachmentUploadResponseSerializer(
            {"file_id": uploaded.id, "filename": uploaded_file.name, "size_bytes": uploaded.size_bytes}
        )
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["delete"], url_path="attachments/(?P<file_id>[^/.]+)")
    def delete_attachment(self, request, file_id=None):
        api_key = self._get_api_key(request.user.iaso_profile.account)
        if not api_key:
            return Response(status=status.HTTP_204_NO_CONTENT)

        try:
            anthropic.Anthropic(api_key=api_key).beta.files.delete(file_id, betas=["files-api-2025-04-14"])
        except anthropic.APIError:
            logger.warning("Failed to delete composite layer AI attachment %s", file_id)

        return Response(status=status.HTTP_204_NO_CONTENT)
