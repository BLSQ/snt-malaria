from django.contrib.auth.models import User
from django.db import models

from iaso.models import OrgUnit
from iaso.utils.models.soft_deletable import (
    DefaultSoftDeletableManager,
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
    class Meta:
        app_label = "snt_malaria"
        ordering = ["name"]
        unique_together = [["intervention_category", "name"]]

    intervention_category = models.ForeignKey(InterventionCategory, on_delete=models.PROTECT)
    created_by = models.ForeignKey(User, on_delete=models.PROTECT)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    cost_per_unit = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return "%s %s" % (self.name, self.id)


class InterventionAssignment(SoftDeletableModel):
    class Meta:
        app_label = "snt_malaria"
        unique_together = [["scenario", "org_unit", "intervention_mix"]]

    scenario = models.ForeignKey(Scenario, on_delete=models.CASCADE, related_name="intervention_assignments")
    org_unit = models.ForeignKey(OrgUnit, on_delete=models.PROTECT)
    intervention_mix = models.ForeignKey("InterventionMix", null=True, on_delete=models.PROTECT)
    created_by = models.ForeignKey(User, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    objects = DefaultSoftDeletableManager()


class InterventionMix(SoftDeletableModel):
    class Meta:
        verbose_name_plural = "Intervention mixes"
        ordering = ["name"]
        unique_together = [["name", "scenario"]]

    account = models.ForeignKey("iaso.Account", null=True, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    scenario = models.ForeignKey(Scenario, on_delete=models.CASCADE, related_name="intervention_mixes")
    interventions = models.ManyToManyField(Intervention)
    objects = DefaultSoftDeletableManager()
