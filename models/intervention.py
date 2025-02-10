from django.db import models
from django.contrib.auth.models import User

from iaso.models import OrgUnit
from iaso.utils.models.soft_deletable import (
    SoftDeletableModel,
)

from plugins.snt_malaria.models.scenario import Scenario


class InterventionFamily(SoftDeletableModel):
    class Meta:
        app_label = "snt_malaria"
        verbose_name_plural = "Intervention families"
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
        unique_together = [["intervention_family", "name"]]

    intervention_family = models.ForeignKey(InterventionFamily, on_delete=models.PROTECT)
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
        unique_together = [["scenario", "org_unit", "intervention"]]

    scenario = models.ForeignKey(Scenario, on_delete=models.CASCADE)
    org_unit = models.ForeignKey(OrgUnit, on_delete=models.PROTECT)
    intervention = models.ForeignKey(Intervention, on_delete=models.PROTECT)
    created_by = models.ForeignKey(User, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
