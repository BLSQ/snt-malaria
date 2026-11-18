from django.db import models


class CostUnitType(models.Model):
    class Meta:
        app_label = "snt_malaria"
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(fields=["workspace", "name"], name="snt_malaria_costunittype_workspace_name_uniq"),
        ]

    workspace = models.ForeignKey("iaso.Workspace", on_delete=models.CASCADE, related_name="snt_cost_unit_types")
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, default="")
    # Commodity units are listed on the scenario summary with their total procurement quantity.
    is_commodity = models.BooleanField(default=False)

    def __str__(self):
        return self.name
