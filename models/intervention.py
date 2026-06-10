from django.contrib.auth.models import User
from django.contrib.postgres.fields import ArrayField
from django.db import models

from iaso.models import OrgUnit
from iaso.utils.models.soft_deletable import (
    DefaultSoftDeletableManager,
    IncludeDeletedSoftDeletableManager,
    OnlyDeletedSoftDeletableManager,
    SoftDeletableModel,
)
from plugins.snt_malaria.models.scenario import Scenario, ScenarioRule


class InterventionCategory(SoftDeletableModel):
    class Meta:
        app_label = "snt_malaria"
        verbose_name_plural = "Intervention categories"
        ordering = ["name"]
        unique_together = [["account", "name"]]

    account = models.ForeignKey("iaso.Account", on_delete=models.CASCADE)
    created_by = models.ForeignKey(User, on_delete=models.PROTECT)
    name = models.CharField(max_length=255)
    short_name = models.CharField(max_length=100, null=True, blank=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = DefaultSoftDeletableManager()
    objects_only_deleted = OnlyDeletedSoftDeletableManager()
    objects_include_deleted = IncludeDeletedSoftDeletableManager()

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
    short_name = models.CharField(max_length=100, null=True, blank=True)
    code = models.CharField(max_length=50)
    impact_ref = models.CharField(
        "Impact Provider Reference",
        max_length=100,
        blank=True,
        default="",
        help_text=(
            "Reference used to match this intervention to its counterpart in the "
            "configured impact data source. The format depends on the provider: "
            "for SwissTPH, use the deployed_int_* column name (e.g. 'deployed_int_smc') "
            "or a comma-separated list for multiple columns (e.g. 'deployed_int_pbo,deployed_int_itn'); "
            "for IDM, use 'type:option' from the intervention_package table (e.g. 'smc:pmc')."
        ),
    )
    target_population = ArrayField(models.CharField(max_length=100), blank=True, default=list)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="intervention_updated_set"
    )

    objects = DefaultSoftDeletableManager()
    objects_only_deleted = OnlyDeletedSoftDeletableManager()
    objects_include_deleted = IncludeDeletedSoftDeletableManager()

    def __str__(self):
        return "%s %s" % (self.name, self.id)


class InterventionAssignment(models.Model):
    scenario = models.ForeignKey(Scenario, on_delete=models.CASCADE, related_name="intervention_assignments")
    org_unit = models.ForeignKey(OrgUnit, on_delete=models.CASCADE)
    intervention = models.ForeignKey(Intervention, on_delete=models.CASCADE)
    # rule and coverage are nullable for backward compatibility, but should be set for any new assignment
    rule = models.ForeignKey(
        ScenarioRule, on_delete=models.CASCADE, related_name="intervention_assignments", null=True, blank=True
    )

    created_by = models.ForeignKey(User, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "snt_malaria"
        unique_together = [["scenario", "org_unit", "intervention"]]
