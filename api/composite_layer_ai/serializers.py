from rest_framework import serializers

from plugins.snt_malaria.api.ai_chat.serializers import (
    attachments_field,
    conversation_history_field,
    quick_replies_field,
)


class CompositeLayerAIRequestSerializer(serializers.Serializer):
    message = serializers.CharField(help_text="User message describing the composite layer to create or modify")
    conversation_history = conversation_history_field()
    current_graph = serializers.DictField(
        required=False,
        allow_null=True,
        default=None,
        help_text="Spec of the graph currently open in the editor (nodes + output), if any",
    )
    attachments = attachments_field()


class CompositeLayerAIResponseSerializer(serializers.Serializer):
    assistant_message = serializers.CharField()
    graph = serializers.DictField(allow_null=True)
    quick_replies = quick_replies_field()
    conversation_history = serializers.ListField(child=serializers.DictField())
