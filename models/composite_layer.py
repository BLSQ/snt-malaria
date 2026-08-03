from django.conf import settings
from django.db import models


class CompositeLayer(models.Model):
    """
    A composite data layer built with the visual node editor.

    Stores the serialized Flume graph so it can be re-opened and edited, plus a link to the
    ``MetricType`` generated when the graph is executed. Running the graph produces a new
    ``MetricType`` (category "Composite") and its ``MetricValue`` rows, so a composite layer
    behaves like any other data layer on the map and can itself be used as a graph input.
    """

    class LegendType(models.TextChoices):
        # ``MetricType.LegendType`` plus two modes resolved when the graph runs: "auto" computes the
        # buckets from the values, "reference" copies another layer's legend.
        AUTO = "auto"
        REFERENCE = "reference"
        LINEAR = "linear"
        THRESHOLD = "threshold"
        ORDINAL = "ordinal"

    class Meta:
        app_label = "snt_malaria"
        ordering = ["-updated_at"]

    account = models.ForeignKey("iaso.Account", on_delete=models.CASCADE, related_name="composite_layers")
    name = models.CharField(max_length=255)
    # Serialized Flume graph: { nodeId: { id, type, x, y, inputData, connections } }.
    graph = models.JSONField(default=dict)
    # Flume canvas comments (annotations), kept separate from the graph so the evaluator, which
    # iterates the graph as a node map, never sees them: { commentId: { id, text, x, y, ... } }.
    comments = models.JSONField(default=dict, blank=True)
    # The MetricType produced by the last successful run of this graph.
    metric_type = models.ForeignKey(
        "iaso.MetricType",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="composite_layer",
    )
    # Legend requested for this layer, mirrored on the graph's output node. `MetricType.legend_type`
    # and `legend_config` hold what a run resolved it to.
    legend_type = models.CharField(max_length=40, choices=LegendType.choices, default=LegendType.AUTO)
    # Manually configured {domain, range}, set for a concrete legend type (empty otherwise).
    legend_config = models.JSONField(default=dict, blank=True)
    # Layer whose legend is copied when legend_type is "reference"; unset means the first one
    # connected to the output.
    legend_reference_metric_type = models.ForeignKey(
        "iaso.MetricType",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
