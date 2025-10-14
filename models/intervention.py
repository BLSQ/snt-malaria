from django.contrib.auth.models import User
from django.db import models
from django.utils.translation import gettext_lazy as _

from iaso.models import OrgUnit
from iaso.utils.models.soft_deletable import (
    SoftDeletableModel,
)
from plugins.snt_malaria.models.scenario import Scenario


class InterventionCategory(SoftDeletableModel):
    class Meta:
        app_label = "snt_malaria"
        verbose_name_plural = "Intervention categories"
        ordering = ["name"]
        unique_together = [["account", "name"]]

    account = models.ForeignKey("iaso.Account", on_delete=models.CASCADE)
    created_by = models.ForeignKey(User, on_delete=models.PROTECT)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return "%s %s" % (self.name, self.id)


class Intervention(SoftDeletableModel):
    class InterventionUnitType(models.TextChoices):
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

    class Meta:
        app_label = "snt_malaria"
        ordering = ["name"]
        unique_together = [["intervention_category", "name"]]

    intervention_category = models.ForeignKey(InterventionCategory, on_delete=models.PROTECT)
    created_by = models.ForeignKey(User, on_delete=models.PROTECT)
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50)
    description = models.TextField(blank=True)
    unit_type = models.CharField(
        max_length=50, choices=InterventionUnitType.choices, default=InterventionUnitType.OTHER
    )
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="intervention_updated_set"
    )

    def __str__(self):
        return "%s %s" % (self.name, self.id)


class InterventionAssignment(models.Model):
    class Meta:
        app_label = "snt_malaria"
        unique_together = [["scenario", "org_unit", "intervention"]]

    scenario = models.ForeignKey(Scenario, on_delete=models.CASCADE, related_name="intervention_assignments")
    org_unit = models.ForeignKey(OrgUnit, on_delete=models.PROTECT)
    intervention = models.ForeignKey(Intervention, on_delete=models.PROTECT)
    created_by = models.ForeignKey(User, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)
