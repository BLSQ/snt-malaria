from rest_framework import serializers

from iaso.api.common import UserSerializer
from iaso.api.metrics.serializers import MetricTypeSerializer
from plugins.snt_malaria.models import CompositeLayer


# Applied to the generated MetricType. Not CompositeLayer columns, so the view pops them off
# validated_data before saving.
METRIC_METADATA_FIELDS = ("category", "description", "units", "unit_symbol", "is_population")


class CompositeLayerListSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompositeLayer
        fields = ["id", "name", "metric_type", "legend_type", "legend_config", "created_at", "updated_at"]


class CompositeLayerRetrieveSerializer(serializers.ModelSerializer):
    # The full resulting layer, so a write response needs no follow-up request.
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
            "legend_type",
            "legend_config",
            "legend_reference_metric_type",
            "created_by",
            "created_at",
            "updated_at",
        ]


class CompositeLayerWriteSerializer(serializers.ModelSerializer):
    graph = serializers.JSONField(required=False)
    comments = serializers.JSONField(required=False, default=dict)
    name = serializers.CharField(required=False, allow_blank=False)
    legend_type = serializers.ChoiceField(choices=CompositeLayer.LegendType.choices, required=False)
    legend_config = serializers.JSONField(required=False)
    # Serializer-only, see METRIC_METADATA_FIELDS.
    category = serializers.CharField(required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True)
    units = serializers.CharField(required=False, allow_blank=True)
    unit_symbol = serializers.CharField(required=False, allow_blank=True, max_length=2)
    is_population = serializers.BooleanField(required=False)

    class Meta:
        model = CompositeLayer
        fields = ["graph", "comments", "name", "legend_type", "legend_config", *METRIC_METADATA_FIELDS]

    def validate_graph(self, graph):
        if not isinstance(graph, dict):
            raise serializers.ValidationError("Graph must be an object.")
        return graph

    def validate_comments(self, comments):
        if not isinstance(comments, dict):
            raise serializers.ValidationError("Comments must be an object.")
        return comments

    def validate_legend_config(self, legend_config):
        domain = legend_config.get("domain") if isinstance(legend_config, dict) else None
        colors = legend_config.get("range") if isinstance(legend_config, dict) else None
        if not isinstance(domain, list) or not isinstance(colors, list) or len(domain) != len(colors):
            raise serializers.ValidationError("Legend config must have matching 'domain' and 'range' lists.")
        return legend_config

    def validate(self, data):
        if self.instance is None and not (data.get("name") or "").strip():
            raise serializers.ValidationError({"name": "This field is required."})
        return data


class CompositeLayerPreviewSerializer(serializers.Serializer):
    graph = serializers.JSONField()

    def validate_graph(self, graph):
        if not isinstance(graph, dict) or not graph:
            raise serializers.ValidationError("Graph must be a non-empty object.")
        return graph
