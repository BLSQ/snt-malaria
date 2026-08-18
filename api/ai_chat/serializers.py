from rest_framework import serializers

from plugins.snt_malaria.services.ai_chat import MAX_QUICK_REPLY_QUESTIONS


# Matches Claude's own per-PDF processing limit.
MAX_ATTACHMENT_SIZE_BYTES = 32 * 1024 * 1024
ALLOWED_ATTACHMENT_CONTENT_TYPE = "application/pdf"
PDF_MAGIC_BYTES = b"%PDF-"


class AttachmentReferenceSerializer(serializers.Serializer):
    file_id = serializers.CharField(help_text="Anthropic Files API id returned by the attachment upload endpoint")
    filename = serializers.CharField()


class AttachmentUploadSerializer(serializers.Serializer):
    file = serializers.FileField(required=True, allow_empty_file=False)

    def validate_file(self, value):
        if value.size > MAX_ATTACHMENT_SIZE_BYTES:
            raise serializers.ValidationError("The file is too large to attach (max 32MB).")
        # Sniff the actual bytes rather than trusting the client-supplied content type.
        header = value.read(len(PDF_MAGIC_BYTES))
        value.seek(0)
        if header != PDF_MAGIC_BYTES:
            raise serializers.ValidationError("Only PDF files can be attached.")
        return value


class AttachmentUploadResponseSerializer(serializers.Serializer):
    file_id = serializers.CharField()
    filename = serializers.CharField()
    size_bytes = serializers.IntegerField()


class QuickReplyQuestionSerializer(serializers.Serializer):
    question = serializers.CharField()
    options = serializers.ListField(child=serializers.CharField())


def attachments_field():
    return AttachmentReferenceSerializer(
        many=True,
        required=False,
        default=list,
        help_text="Documents attached to this message, already uploaded via the attachments endpoint",
    )


def quick_replies_field():
    return QuickReplyQuestionSerializer(
        many=True,
        allow_null=True,
        required=False,
        default=None,
        help_text=f"Up to {MAX_QUICK_REPLY_QUESTIONS} pick-one questions to render as selectable options",
    )


def conversation_history_field():
    return serializers.ListField(
        child=serializers.DictField(),
        required=False,
        default=list,
        help_text="Previous conversation messages",
    )
