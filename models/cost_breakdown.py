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

    class Meta:
        app_label = "snt_malaria"

    intervention = models.ForeignKey(Intervention, on_delete=models.CASCADE)
    name = models.TextField(max_length=255, blank=False)
    category = models.CharField(
        max_length=40,
        choices=InterventionCostBreakdownLineCategory.choices,
        default=InterventionCostBreakdownLineCategory.OTHER,
    )
    unit_cost = models.FloatField()

    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="cost_breakdown_line_created_set"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="cost_breakdown_line_updated_set"
    )
    updated_at = models.DateTimeField(auto_now=True)
