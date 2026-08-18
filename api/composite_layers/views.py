from django.db import transaction
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from iaso.models.metric import MetricType
from plugins.snt_malaria.models import CompositeLayer
from plugins.snt_malaria.models.account_settings import get_intervention_org_units
from plugins.snt_malaria.services.composite.evaluator import CompositeGraphError, CompositeGraphIncompleteError
from plugins.snt_malaria.services.composite.graph import apply_legend_to_graph, is_runnable, read_legend_from_graph
from plugins.snt_malaria.services.composite.persistence import (
    apply_composite_metadata,
    create_composite_metric_type,
    preview_composite_layer,
    run_and_persist_composite_layer,
    update_composite_metric_type,
)

from .permissions import CompositeLayerPermission
from .serializers import (
    METRIC_METADATA_FIELDS,
    CompositeLayerListSerializer,
    CompositeLayerPreviewSerializer,
    CompositeLayerRetrieveSerializer,
    CompositeLayerWriteSerializer,
)


class CompositeLayerViewSet(viewsets.ModelViewSet):
    """
    Composite data layers: a serialized node graph plus the ``MetricType`` it produces.

    POST creates the layer right away, with a seeded graph and a ``MetricType`` that has no values
    yet. Any write carrying a runnable graph evaluates it and refreshes that ``MetricType`` and its
    ``MetricValue`` rows; a graph that cannot run yet is stored as-is.
    """

    ordering_fields = ["id", "name", "updated_at"]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]
    permission_classes = [CompositeLayerPermission]

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

    @staticmethod
    def _pop_metric_metadata(serializer):
        """Pop the MetricType-only metadata off validated_data (it must not reach
        ``serializer.save()``). Returns only the provided keys."""
        data = serializer.validated_data
        return {field: data.pop(field) for field in METRIC_METADATA_FIELDS if field in data}

    @staticmethod
    def _account_metric_type_id(metric_type_id, account):
        """A graph can name a layer that has since been deleted, so ids read from it are checked."""
        if metric_type_id is None:
            return None
        if not MetricType.objects.filter(id=metric_type_id, account=account).exists():
            return None
        return metric_type_id

    def perform_create(self, serializer):
        account = self.request.user.iaso_profile.account
        data = serializer.validated_data
        name = data["name"].strip()
        metadata = self._pop_metric_metadata(serializer)
        legend_type = data.get("legend_type") or CompositeLayer.LegendType.AUTO
        legend_config = data.get("legend_config") or {}
        # The legend is mirrored onto the graph's output node; a request without a graph gets a
        # seeded one.
        graph = apply_legend_to_graph(data.get("graph"), legend_type, legend_config)

        metric_type = None
        if is_runnable(graph):
            try:
                metric_type = run_and_persist_composite_layer(
                    account=account,
                    graph=graph,
                    org_unit_ids=self._intervention_org_unit_ids(),
                    name=name,
                    **metadata,
                )
            except CompositeGraphIncompleteError:
                metric_type = None
            except CompositeGraphError as error:
                raise serializers.ValidationError({"graph": str(error)})

        if metric_type is None:
            metric_type = create_composite_metric_type(
                account,
                name=name,
                legend_type=legend_type,
                legend_config=legend_config,
                **metadata,
            )

        serializer.save(
            account=account,
            name=name,
            graph=graph,
            legend_type=legend_type,
            legend_config=legend_config,
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
        account = self.request.user.iaso_profile.account
        data = serializer.validated_data
        metadata = self._pop_metric_metadata(serializer)
        name = data.get("name")
        graph_provided = "graph" in data
        legend_provided = "legend_type" in data or "legend_config" in data
        graph = data.get("graph", instance.graph)
        extra = {}

        # An explicit legend wins and is written onto the graph; otherwise the graph carries it, and
        # it is read back out of the output node.
        if legend_provided:
            legend_type = data.get("legend_type", instance.legend_type)
            legend_config = data.get("legend_config", instance.legend_config)
            graph = apply_legend_to_graph(graph, legend_type, legend_config, instance.legend_reference_metric_type_id)
            extra["graph"] = graph
        elif graph_provided:
            legend_type, legend_config, reference_metric_type_id = read_legend_from_graph(graph)
            extra["legend_type"] = legend_type
            extra["legend_config"] = legend_config
            extra["legend_reference_metric_type_id"] = self._account_metric_type_id(reference_metric_type_id, account)
        else:
            legend_type, legend_config = instance.legend_type, instance.legend_config

        metric_type = instance.metric_type
        # An unfinished graph is still stored, keeping the values of the last successful run.
        has_run = False
        if (graph_provided or legend_provided) and is_runnable(graph):
            try:
                if metric_type is not None:
                    metric_type = update_composite_metric_type(
                        account=account,
                        metric_type=metric_type,
                        graph=graph,
                        org_unit_ids=self._intervention_org_unit_ids(),
                        name=name,
                        **metadata,
                    )
                else:
                    # The generated MetricType is SET_NULL and may have been deleted independently.
                    metric_type = run_and_persist_composite_layer(
                        account=account,
                        graph=graph,
                        org_unit_ids=self._intervention_org_unit_ids(),
                        name=(name or instance.name),
                        **metadata,
                    )
                has_run = True
            except CompositeGraphIncompleteError:
                has_run = False
            except CompositeGraphError as error:
                raise serializers.ValidationError({"graph": str(error)})

        if not has_run:
            if metric_type is None:
                metric_type = create_composite_metric_type(
                    account,
                    name=(name or instance.name),
                    legend_type=legend_type,
                    legend_config=legend_config,
                    **metadata,
                )
            elif metadata or name or legend_provided:
                apply_composite_metadata(
                    metric_type,
                    name=name,
                    legend_type=legend_type if legend_provided else None,
                    legend_config=legend_config if legend_provided else None,
                    **metadata,
                )

        extra["metric_type"] = metric_type
        if name:
            extra["name"] = name

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
