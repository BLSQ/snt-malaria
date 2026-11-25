from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from iaso.api.common.serializer_fields import JSONSchemaField
from iaso.models import MetricType
from plugins.snt_malaria.providers.openhexa_data_layers import (
    fetch_dataset_json,
    resolve_metadata_file,
)

from .metadata import build_data_layer


class OpenHexaDataLayerSerializer(serializers.Serializer):
    """One data-layer definition read from the OpenHexa data layer metadata file.

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


class ImportOpenHexaDataLayerSerializer(serializers.Serializer):
    """Create the ``MetricType`` shell for one OpenHexa data layer, or reuse the existing one.

    A new layer's metadata is read from the OpenHexa metadata file; the client only picks the
    ``code`` and may override the legend colours. An existing layer is left untouched. The values
    are loaded by the ``import_openhexa_data_layer`` task the view launches afterwards.
    """

    code = serializers.CharField()
    legend_config = JSONSchemaField(schema=MetricType.LEGEND_CONFIG_SCHEMA, required=False, allow_null=False)

    def validate(self, data):
        account = self.context["request"].user.iaso_profile.account

        try:
            metadata = fetch_dataset_json(*resolve_metadata_file(account))
        except DjangoValidationError as djangoError:
            raise serializers.ValidationError({"code": djangoError.messages[0]})

        definition = metadata.get(data["code"])
        if not isinstance(definition, dict):
            raise serializers.ValidationError({"code": _("This data layer is not defined in OpenHexa.")})

        existing = MetricType.objects.filter(account=account, code=data["code"]).first()
        if existing and existing.origin != MetricType.MetricTypeOrigin.OPENHEXA:
            raise serializers.ValidationError(
                {"code": _("A layer with this data key already exists and is not managed by OpenHexa.")}
            )
        data["existing"] = existing
        if existing:
            return data

        layer = build_data_layer(data["code"], definition)
        if layer.get("error"):
            raise serializers.ValidationError({"code": layer["error"]})
        data["layer"] = layer
        return data

    def save(self):
        # Re-importing an existing layer ("Refresh from OpenHexa") only reloads its values;
        # its metadata and legend may have been edited by the user since the first import.
        existing = self.validated_data["existing"]
        if existing:
            return existing

        account = self.context["request"].user.iaso_profile.account
        layer = self.validated_data["layer"]
        return MetricType.objects.create(
            account=account,
            code=layer["code"],
            name=layer["name"],
            description=layer["description"],
            source=layer["source"],
            units=layer["units"],
            unit_symbol=layer["unit_symbol"],
            category=layer["category"],
            legend_type=layer["legend_type"],
            legend_config=self.validated_data.get("legend_config") or layer["legend_config"],
            metric_kind=layer["metric_kind"],
            origin=MetricType.MetricTypeOrigin.OPENHEXA,
            is_complete=False,
        )


class CancelOpenHexaImportSerializer(serializers.Serializer):
    """Which layer's in-flight value import to stop, by its ``MetricType`` id."""

    metric_type_id = serializers.IntegerField()
