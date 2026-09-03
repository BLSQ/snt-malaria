import logging

from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from iaso.api.tasks.serializers import TaskSerializer
from iaso.models import Task
from iaso.utils.openhexa import get_openhexa_config
from plugins.snt_malaria.tasks.import_openhexa_data_layer import import_openhexa_data_layer

from .client import METADATA_FILENAME, fetch_dataset_json
from .constants import CONFIG_DATASET_KEY, IMPORT_TASK_NAME
from .metadata import parse_data_layers
from .permissions import OpenHexaDataLayerPermission
from .serializers import ImportOpenHexaDataLayerSerializer, OpenHexaDataLayerSerializer


logger = logging.getLogger(__name__)


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
            metadata = fetch_dataset_json(openhexa_url, openhexa_token, workspace_slug, dataset_slug, METADATA_FILENAME)
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

    def create(self, request):
        """Create (or refresh) a data layer from OpenHexa and launch its value import.

        Body: ``{"code": "<layer key>", "legend_config": {...}?}``. The ``MetricType`` shell
        is upserted synchronously; the ``import_openhexa_data_layer`` task then loads the
        values from the layer's source file.
        """
        serializer = ImportOpenHexaDataLayerSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        metric_type = serializer.save()

        task = import_openhexa_data_layer(metric_type_id=metric_type.id, user=request.user)

        return Response(
            {"task": TaskSerializer(instance=task).data, "metric_type_id": metric_type.id},
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["get"], url_path="import_status")
    def import_status(self, request):
        """Latest value-import task status per OpenHexa data layer for the account.

        Returns ``{ "<metric_type_id>": {task_id, status, progress_message, created_at,
        ended_at}, ... }`` - the data layer list uses it to show a per-row import badge.
        """
        account = request.user.iaso_profile.account
        tasks = (
            Task.objects.filter(account=account, name=IMPORT_TASK_NAME)
            .order_by("-created_at")
            .values("id", "status", "progress_message", "created_at", "ended_at", "params")
        )

        latest_by_metric_type: dict = {}
        for task in tasks:
            metric_type_id = ((task["params"] or {}).get("kwargs") or {}).get("metric_type_id")
            if metric_type_id is None or metric_type_id in latest_by_metric_type:
                continue
            latest_by_metric_type[metric_type_id] = {
                "task_id": task["id"],
                "status": task["status"],
                "progress_message": task["progress_message"],
                "created_at": task["created_at"],
                "ended_at": task["ended_at"],
            }
        return Response(latest_by_metric_type)
