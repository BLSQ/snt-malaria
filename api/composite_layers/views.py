from django.db import transaction
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from iaso.api.common.permissions import HasAccountFeatureFlag
from plugins.snt_malaria.models import CompositeLayer
from plugins.snt_malaria.models.account_settings import get_intervention_org_units
from plugins.snt_malaria.services.composite.evaluator import CompositeGraphError
from plugins.snt_malaria.services.composite.persistence import (
    preview_composite_layer,
    run_and_persist_composite_layer,
    update_composite_metric_type,
)

from .permissions import SHOW_DEV_FEATURES, CompositeLayerPermission
from .serializers import (
    CompositeLayerListSerializer,
    CompositeLayerPreviewSerializer,
    CompositeLayerRetrieveSerializer,
    CompositeLayerWriteSerializer,
)


class CompositeLayerViewSet(viewsets.ModelViewSet):
    """
    Composite data layers built with the visual node editor.

    Creating one runs the serialized Flume graph on the backend and persists the result as a new
    ``MetricType`` + ``MetricValue`` rows, so it appears on the data layers map like any other layer.
    """

    ordering_fields = ["id", "name", "updated_at"]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]
    permission_classes = [CompositeLayerPermission, HasAccountFeatureFlag(SHOW_DEV_FEATURES)]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated or not hasattr(user, "iaso_profile"):
            return CompositeLayer.objects.none()
        return CompositeLayer.objects.filter(account=user.iaso_profile.account).select_related("metric_type")

    def get_serializer_class(self):
        if self.action == "list":
            return CompositeLayerListSerializer
        if self.action in ("create", "partial_update", "update"):
            return CompositeLayerWriteSerializer
        if self.action == "preview":
            return CompositeLayerPreviewSerializer
        return CompositeLayerRetrieveSerializer

    def _intervention_org_unit_ids(self):
        account = self.request.user.iaso_profile.account
        return list(get_intervention_org_units(account).values_list("id", flat=True))

    def perform_create(self, serializer):
        account = self.request.user.iaso_profile.account
        graph = serializer.validated_data["graph"]

        try:
            metric_type = run_and_persist_composite_layer(
                account=account,
                graph=graph,
                org_unit_ids=self._intervention_org_unit_ids(),
            )
        except CompositeGraphError as error:
            raise serializers.ValidationError({"graph": str(error)})

        serializer.save(
            account=account,
            name=metric_type.name,
            metric_type=metric_type,
            created_by=self.request.user,
        )

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """
        Overriding both create and perform_create to be able to return another type of serializer from the input one
        """
        create_serializer = self.get_serializer(data=request.data)
        create_serializer.is_valid(raise_exception=True)
        self.perform_create(create_serializer)

        result_serializer = CompositeLayerRetrieveSerializer(create_serializer.instance)
        return Response(result_serializer.data, status=status.HTTP_201_CREATED)

    def perform_update(self, serializer):
        instance = serializer.instance
        graph = serializer.validated_data.get("graph")
        extra = {}

        if graph is not None:
            account = self.request.user.iaso_profile.account
            org_unit_ids = self._intervention_org_unit_ids()
            try:
                if instance.metric_type_id:
                    # Re-run and refresh the existing MetricType in place, keeping its id.
                    name, metric_type = update_composite_metric_type(
                        account=account,
                        metric_type=instance.metric_type,
                        graph=graph,
                        org_unit_ids=org_unit_ids,
                    )
                else:
                    # The generated MetricType is SET_NULL and may have been deleted independently.
                    metric_type = run_and_persist_composite_layer(
                        account=account, graph=graph, org_unit_ids=org_unit_ids
                    )
                    name = metric_type.name
            except CompositeGraphError as error:
                raise serializers.ValidationError({"graph": str(error)})
            extra = {"name": name, "metric_type": metric_type}

        serializer.save(**extra)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        """
        Overriding both update and perform_update to be able to return another type of serializer from the input one
        """
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        update_serializer = self.get_serializer(instance, data=request.data, partial=partial)
        update_serializer.is_valid(raise_exception=True)
        self.perform_update(update_serializer)

        result_serializer = CompositeLayerRetrieveSerializer(update_serializer.instance)
        return Response(result_serializer.data, status=status.HTTP_200_OK)

    @transaction.atomic
    def perform_destroy(self, instance):
        # Also drop the generated MetricType (and its MetricValue rows, via cascade) so the
        # composite disappears from the data layers list.
        metric_type = instance.metric_type
        super().perform_destroy(instance)
        if metric_type is not None:
            metric_type.delete()

    @action(detail=False, methods=["post"])
    def preview(self, request, *args, **kwargs):
        """Evaluate a graph and return its result for the live preview, without persisting."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        account = request.user.iaso_profile.account
        try:
            result = preview_composite_layer(
                account, serializer.validated_data["graph"], self._intervention_org_unit_ids()
            )
        except CompositeGraphError as error:
            raise serializers.ValidationError({"graph": str(error)})

        return Response(result, status=status.HTTP_200_OK)
