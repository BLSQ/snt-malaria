from rest_framework import serializers


class CompositeLayerAIRequestSerializer(serializers.Serializer):
    message = serializers.CharField(help_text="User message describing the composite layer to create or modify")
    conversation_history = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        default=list,
        help_text="Previous conversation messages",
    )


class CompositeLayerAIResponseSerializer(serializers.Serializer):
    assistant_message = serializers.CharField()
    graph = serializers.DictField(allow_null=True)
    conversation_history = serializers.ListField(child=serializers.DictField())
