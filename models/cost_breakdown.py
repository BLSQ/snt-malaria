from django.contrib.auth.models import User
from django.db import models
from django.utils.translation import gettext_lazy as _

from plugins.snt_malaria.models.intervention import Intervention


class InterventionCostBreakdownLine(models.Model):
    class InterventionCostBreakdownLineCategory(models.TextChoices):
        PROCUREMENT = "Procurement", _("Procurement")
        DELIVERY = "Distribution", _("Distribution")
        OPERATIONAL = "Operational", _("Operational")
        SUPPORTIVE = "Supportive", _("Supportive")
        OTHER = "Other", _("Other")

    class CostDriver(models.TextChoices):
        POPULATION = "population", _("Population")
        FIXED_COST = "fixed_cost", _("Fixed cost")

    class Meta:
        app_label = "snt_malaria"

    intervention = models.ForeignKey(Intervention, on_delete=models.CASCADE, related_name="cost_breakdown_lines")
    name = models.TextField(max_length=255, blank=False)
    category = models.CharField(
        max_length=40,
        choices=InterventionCostBreakdownLineCategory.choices,
        default=InterventionCostBreakdownLineCategory.OTHER,
    )
    unit_type = models.ForeignKey(
        "snt_malaria.CostUnitType",
        on_delete=models.PROTECT,
        related_name="cost_breakdown_lines",
    )
    population_layer = models.ForeignKey(
        "iaso.MetricType",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="cost_breakdown_lines",
    )
    cost_driver = models.CharField(
        max_length=20,
        choices=CostDriver.choices,
        default=CostDriver.POPULATION,
    )
    unit_cost = models.DecimalField(max_digits=19, decimal_places=2, null=False, blank=False, default=0)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="cost_breakdown_line_created_set"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="cost_breakdown_line_updated_set"
    )
    updated_at = models.DateTimeField(auto_now=True)
