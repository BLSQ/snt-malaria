from decimal import Decimal

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
    # Raw number entered by the user; interpreted via ``invert_value`` to produce ``ratio``.
    value = models.DecimalField(max_digits=19, decimal_places=6, null=True, blank=True)
    # When True, ``value`` is inverted (1 / value) to get the canonical ratio.
    invert_value = models.BooleanField(default=False)
    description = models.TextField(blank=True, default="")

    def __str__(self):
        return self.name

    @property
    def ratio(self):
        """Canonical conversion factor used by the budget calculation (1 / value when inverted)."""
        if self.value is None:
            return None
        if self.invert_value:
            if self.value == 0:
                return None
            return Decimal(1) / self.value
        return self.value
