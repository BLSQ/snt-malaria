from rest_framework import serializers


class OpenHexaDataLayerSerializer(serializers.Serializer):
    """One data-layer definition read from the OpenHexa ``SNT_metadata.json`` file.

    The shape mirrors the ``MetricType`` fields the data-layer form pre-fills.
    """

    code = serializers.CharField()
    name = serializers.CharField()
    description = serializers.CharField(allow_blank=True)
    source = serializers.CharField(allow_blank=True)
    units = serializers.CharField(allow_blank=True)
    category = serializers.CharField(allow_blank=True)
    unit_symbol = serializers.CharField(allow_blank=True)
    legend_type = serializers.CharField()
    legend_config = serializers.JSONField()
    metric_kind = serializers.CharField()
    error = serializers.CharField(allow_blank=True)
