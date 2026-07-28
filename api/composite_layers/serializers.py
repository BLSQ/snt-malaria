from rest_framework import serializers

from iaso.api.common import UserSerializer
from iaso.api.metrics.serializers import MetricTypeSerializer
from plugins.snt_malaria.models import CompositeLayer


class CompositeLayerListSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompositeLayer
        fields = ["id", "name", "metric_type", "created_at", "updated_at"]


class CompositeLayerRetrieveSerializer(serializers.ModelSerializer):
    # Full resulting layer, so the client can display it on the map right after saving.
    metric_type_detail = MetricTypeSerializer(source="metric_type", read_only=True)
    created_by = UserSerializer(read_only=True)

    class Meta:
        model = CompositeLayer
        fields = [
            "id",
            "name",
            "graph",
            "comments",
            "metric_type",
            "metric_type_detail",
            "created_by",
            "created_at",
            "updated_at",
        ]


class CompositeLayerWriteSerializer(serializers.ModelSerializer):
    graph = serializers.JSONField()
    comments = serializers.JSONField(required=False, default=dict)
    # Layer metadata is owned by the creation/edit dialogue, not the graph. `name` is a model field;
    # the rest are serializer-only and applied to the generated MetricType by the view/persistence.
    name = serializers.CharField(required=False, allow_blank=False)
    category = serializers.CharField(required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True)
    units = serializers.CharField(required=False, allow_blank=True)
    unit_symbol = serializers.CharField(required=False, allow_blank=True, max_length=2)
    is_population = serializers.BooleanField(required=False)

    class Meta:
        model = CompositeLayer
        fields = [
            "graph",
            "comments",
            "name",
            "category",
            "description",
            "units",
            "unit_symbol",
            "is_population",
        ]

    def validate_graph(self, graph):
        if not isinstance(graph, dict) or not graph:
            raise serializers.ValidationError("Graph must be a non-empty object.")
        return graph

    def validate_comments(self, comments):
        if not isinstance(comments, dict):
            raise serializers.ValidationError("Comments must be an object.")
        return comments


class CompositeLayerPreviewSerializer(serializers.Serializer):
    graph = serializers.JSONField()

    def validate_graph(self, graph):
        if not isinstance(graph, dict) or not graph:
            raise serializers.ValidationError("Graph must be a non-empty object.")
        return graph
