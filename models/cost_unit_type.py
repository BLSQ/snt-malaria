from django.db import models

from plugins.snt_malaria.models.workspace_scoped import WorkspaceFromAccountMixin


class CostUnitType(WorkspaceFromAccountMixin, models.Model):
    class Meta:
        app_label = "snt_malaria"
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(fields=["account", "name"], name="snt_malaria_costunittype_account_name_uniq"),
        ]

    account = models.ForeignKey("iaso.Account", on_delete=models.CASCADE, related_name="cost_unit_types")
    workspace = models.ForeignKey(
        "iaso.Workspace", null=True, blank=True, on_delete=models.CASCADE, related_name="snt_cost_unit_types"
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, default="")
    # Commodity units are listed on the scenario summary with their total procurement quantity.
    is_commodity = models.BooleanField(default=False)

    def __str__(self):
        return self.name
