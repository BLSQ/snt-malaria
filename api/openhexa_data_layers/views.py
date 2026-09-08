import logging

from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.response import Response

from iaso.utils.openhexa import get_openhexa_config

from .client import fetch_data_layer_metadata
from .metadata import parse_data_layers
from .permissions import OpenHexaDataLayerPermission
from .serializers import OpenHexaDataLayerSerializer


logger = logging.getLogger(__name__)

CONFIG_DATASET_KEY = "snt_configuration_dataset"


@extend_schema(tags=["SNT Malaria - OpenHexa data layers"])
class OpenHexaDataLayerViewSet(viewsets.ViewSet):
    """Data layers declared in the account's OpenHexa configuration dataset.

    ``GET /api/snt_malaria/openhexa/data_layers/`` reads ``SNT_metadata.json`` from the
    dataset named by the ``snt_configuration_dataset`` workspace config key and returns one
    entry per definition. Each entry pre-fills the data-layer form; the values themselves
    are imported later.
    """

    permission_classes = [OpenHexaDataLayerPermission]

    def list(self, request):
        account = request.user.iaso_profile.account

        try:
            openhexa_url, openhexa_token, workspace_slug, workspace = get_openhexa_config(account)
        except ValidationError as error:
            return Response({"error": error.messages[0]}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

        dataset_slug = (workspace.config or {}).get(CONFIG_DATASET_KEY)
        if not dataset_slug:
            return Response(
                {
                    "error": _("The OpenHexa workspace configuration is missing the '{key}' key.").format(
                        key=CONFIG_DATASET_KEY
                    )
                },
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        try:
            metadata = fetch_data_layer_metadata(openhexa_url, openhexa_token, workspace_slug, dataset_slug)
        except ValidationError as error:
            return Response({"error": error.messages[0]}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
        except Exception:
            logger.exception("Failed to fetch OpenHexa data layer metadata for account %s", account.id)
            return Response(
                {"error": _("Failed to fetch data layers from OpenHexa.")},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        try:
            layers = parse_data_layers(metadata)
        except Exception:
            logger.exception("Malformed OpenHexa data layer metadata for account %s", account.id)
            return Response(
                {"error": _("The OpenHexa data layer configuration file is malformed.")},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        return Response({"results": OpenHexaDataLayerSerializer(layers, many=True).data})
