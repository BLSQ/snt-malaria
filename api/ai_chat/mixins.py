import logging

import anthropic

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response

from iaso.utils.virus_scan.clamav import scan_uploaded_file_for_virus
from iaso.utils.virus_scan.model import VirusScanStatus
from plugins.snt_malaria.services.ai_chat import delete_file, upload_file

from .serializers import (
    ALLOWED_ATTACHMENT_CONTENT_TYPE,
    AttachmentUploadResponseSerializer,
    AttachmentUploadSerializer,
)


logger = logging.getLogger(__name__)


class AIChatAttachmentViewSetMixin:
    """Adds the document-attachment endpoints to an AI chat viewset.

    Uploads are proxied to the Anthropic Files API and referenced by id from later chat messages;
    nothing is stored locally. Including viewsets must define `API_KEY_MISSING_ERROR`.
    """

    API_KEY_MISSING_ERROR: str

    def _get_api_key(self, request):
        return request.user.iaso_profile.account.anthropic_api_key or None

    @action(detail=False, methods=["post"], url_path="attachments")
    def upload_attachment(self, request):
        serializer = AttachmentUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        uploaded_file = serializer.validated_data["file"]

        api_key = self._get_api_key(request)
        if not api_key:
            return Response({"error": self.API_KEY_MISSING_ERROR}, status=status.HTTP_400_BAD_REQUEST)

        scan_result, _ = scan_uploaded_file_for_virus(uploaded_file)
        if scan_result in (VirusScanStatus.INFECTED, VirusScanStatus.ERROR):
            return Response(
                {"error": "This file could not be verified as safe and was not attached."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            uploaded = upload_file(api_key, uploaded_file, ALLOWED_ATTACHMENT_CONTENT_TYPE)
        except anthropic.APIError:
            logger.exception("AI chat attachment upload error")
            return Response(
                {"error": "Failed to upload the attachment. Please try again."}, status=status.HTTP_400_BAD_REQUEST
            )

        return Response(AttachmentUploadResponseSerializer(uploaded).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["delete"], url_path="attachments/(?P<file_id>[^/.]+)")
    def delete_attachment(self, request, file_id=None):
        api_key = self._get_api_key(request)
        if api_key:
            delete_file(api_key, file_id)

        return Response(status=status.HTTP_204_NO_CONTENT)
