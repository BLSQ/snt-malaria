from django.db import models


class CostUnitType(models.Model):
    class Meta:
        app_label = "snt_malaria"
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(fields=["account", "name"], name="snt_malaria_costunittype_account_name_uniq"),
        ]

    account = models.ForeignKey("iaso.Account", on_delete=models.CASCADE, related_name="cost_unit_types")
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, default="")

    def __str__(self):
        return self.name
