from django.contrib.auth.models import User
from django.db import models
from django.utils.translation import gettext_lazy as _

from plugins.snt_malaria.models.intervention import Intervention


class InterventionCostUnitType(models.TextChoices):
    PER_ITN = "PER_ITN", _("per ITN")
    PER_SP = "PER_SP", _("per SP")
    PER_CHILD = "PER_CHILD", _("per child")
    PER_DOSE = "PER_DOSE", _("per dose")
    PER_SPAQ_3_11_MONTHS = "PER_SPAQ_3_11_MONTHS", _("per SPAQ pack 3-11 month olds")
    PER_SPAQ_12_59_MONTHS = "PER_SPAQ_12_59_MONTHS", _("per SPAQ pack 12-59 month olds")
    PER_SPAQ_5_10_YEARS = "PER_SPAQ_5_10_YEARS", _("per SPAQ pack 5-10 years olds")
    PER_RDT_KIT = "PER_RDT_KIT", _("per RDT kit")
    PER_AL = "PER_AL", _("per AL")
    PER_60MG_POWDER = "PER_60MG_POWDER", _("per 60mg powder")
    PER_RAS = "PER_RAS", _("per RAS")
    PER_BALE = "PER_BALE", _("per bale")
    OTHER = "OTHER", _("Other")


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
    unit_type = models.CharField(
        max_length=50, choices=InterventionCostUnitType.choices, default=InterventionCostUnitType.OTHER
    )
    unit_cost = models.DecimalField(max_digits=19, decimal_places=2, null=False, blank=False, default=0)
    year = models.IntegerField(null=False, blank=False)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="cost_breakdown_line_created_set"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="cost_breakdown_line_updated_set"
    )
    updated_at = models.DateTimeField(auto_now=True)
