from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from iaso.api.common.serializer_fields import JSONSchemaField
from iaso.models import MetricType
from iaso.utils.openhexa import get_openhexa_config

from .client import METADATA_FILENAME, fetch_dataset_json
from .constants import CONFIG_DATASET_KEY
from .metadata import build_data_layer


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


class ImportOpenHexaDataLayerSerializer(serializers.Serializer):
    """Upsert the ``MetricType`` shell for one OpenHexa data layer.

    The metadata is re-read from ``SNT_metadata.json`` (the source of truth); the client
    only picks the ``code`` and may override the legend colours. The values themselves are
    loaded by the ``import_openhexa_data_layer`` task the view launches afterwards.
    """

    code = serializers.CharField()
    legend_config = JSONSchemaField(schema=MetricType.LEGEND_CONFIG_SCHEMA, required=False, allow_null=False)

    def validate(self, data):
        account = self.context["request"].user.iaso_profile.account

        try:
            openhexa_url, openhexa_token, workspace_slug, workspace = get_openhexa_config(account)
        except DjangoValidationError as error:
            raise serializers.ValidationError({"code": error.messages[0]})

        dataset_slug = (workspace.config or {}).get(CONFIG_DATASET_KEY)
        if not dataset_slug:
            raise serializers.ValidationError(
                {
                    "code": _("The OpenHexa workspace configuration is missing the '{key}' key.").format(
                        key=CONFIG_DATASET_KEY
                    )
                }
            )

        try:
            metadata = fetch_dataset_json(openhexa_url, openhexa_token, workspace_slug, dataset_slug, METADATA_FILENAME)
        except DjangoValidationError as error:
            raise serializers.ValidationError({"code": error.messages[0]})

        definition = metadata.get(data["code"])
        if not isinstance(definition, dict):
            raise serializers.ValidationError({"code": _("This data layer is not defined in OpenHexa.")})

        layer = build_data_layer(data["code"], definition)
        if layer.get("error"):
            raise serializers.ValidationError({"code": layer["error"]})

        existing = MetricType.objects.filter(account=account, code=layer["code"]).first()
        if existing and existing.origin != MetricType.MetricTypeOrigin.OPENHEXA:
            raise serializers.ValidationError(
                {"code": _("A layer with this data key already exists and is not managed by OpenHexa.")}
            )

        data["account"] = account
        data["layer"] = layer
        return data

    def save(self):
        account = self.validated_data["account"]
        layer = self.validated_data["layer"]
        legend_config = self.validated_data.get("legend_config") or layer["legend_config"]

        metric_type, _created = MetricType.objects.update_or_create(
            account=account,
            code=layer["code"],
            defaults={
                "name": layer["name"],
                "description": layer["description"],
                "source": layer["source"],
                "units": layer["units"],
                "unit_symbol": layer["unit_symbol"],
                "category": layer["category"],
                "legend_type": layer["legend_type"],
                "legend_config": legend_config,
                "metric_kind": layer["metric_kind"],
                "origin": MetricType.MetricTypeOrigin.OPENHEXA,
            },
        )
        return metric_type
