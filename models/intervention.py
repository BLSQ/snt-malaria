from django.contrib.auth.models import User
from django.db import models
from django.db.models import Q

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
    org_unit = models.ForeignKey(OrgUnit, on_delete=models.PROTECT)
    intervention = models.ForeignKey(Intervention, on_delete=models.PROTECT)
    # rule and coverage are nullable for backward compatibility, but should be set for any new assignment
    rule = models.ForeignKey(
        ScenarioRule, on_delete=models.PROTECT, related_name="intervention_assignments", null=True, blank=True
    )
    coverage = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)

    # the following attributes were stored in BudgetAssumptions before
    # they should be set in case a specific value needs to be overridden for a given assignment
    # if not set, default values from the budget calculator will be used
    divisor = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)
    bale_size = models.IntegerField(null=True, blank=True)
    buffer_mult = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)
    doses_per_pw = models.IntegerField(null=True, blank=True)
    age_string = models.CharField(blank=True)
    pop_prop_3_11 = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)
    pop_prop_12_59 = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)
    monthly_rounds = models.IntegerField(null=True, blank=True)
    touchpoints = models.IntegerField(null=True, blank=True)
    tablet_factor = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)
    doses_per_child = models.IntegerField(null=True, blank=True)

    created_by = models.ForeignKey(User, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "snt_malaria"
        unique_together = [["scenario", "org_unit", "intervention"]]
        constraints = [
            models.CheckConstraint(
                check=Q(Q(coverage__isnull=True) | Q(Q(coverage__gte=0) & Q(coverage__lte=1))),
                name="assignment_coverage_between_0_and_1",
            ),
        ]
