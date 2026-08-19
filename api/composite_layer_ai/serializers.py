from rest_framework import serializers


class CompositeLayerAIRequestSerializer(serializers.Serializer):
    message = serializers.CharField(help_text="User message describing the composite layer to create or modify")
    conversation_history = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        default=list,
        help_text="Previous conversation messages",
    )
    current_graph = serializers.DictField(
        required=False,
        allow_null=True,
        default=None,
        help_text="Spec of the graph currently open in the editor (nodes + output), if any",
    )


class QuickReplyQuestionSerializer(serializers.Serializer):
    question = serializers.CharField()
    options = serializers.ListField(child=serializers.CharField())


class CompositeLayerAIResponseSerializer(serializers.Serializer):
    assistant_message = serializers.CharField()
    graph = serializers.DictField(allow_null=True)
    quick_replies = QuickReplyQuestionSerializer(many=True, allow_null=True, required=False, default=None)
    conversation_history = serializers.ListField(child=serializers.DictField())
