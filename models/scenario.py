from django.contrib.auth.models import User
from django.contrib.postgres.fields import ArrayField
from django.db import models
from django.db.models import Q

from iaso.utils.colors import DEFAULT_COLOR
from iaso.utils.models.color import ColorField
from iaso.utils.models.soft_deletable import (
    DefaultSoftDeletableManager,
    SoftDeletableModel,
)


class Scenario(SoftDeletableModel):
    class Meta:
        app_label = "snt_malaria"
        ordering = ["-updated_at"]
        unique_together = [["account", "name"]]
        constraints = [
            models.CheckConstraint(
                check=models.Q(start_year__lte=models.F("end_year")),
                name="%(app_label)s_%(class)s_start_year_lte_end_year",
            )
        ]

    account = models.ForeignKey("iaso.Account", on_delete=models.CASCADE)
    created_by = models.ForeignKey(User, on_delete=models.PROTECT)
    name = models.CharField(max_length=255, blank=False, null=False)
    description = models.TextField(blank=True)
    start_year = models.IntegerField(blank=False, null=False)
    end_year = models.IntegerField(blank=False, null=False)
    is_locked = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = DefaultSoftDeletableManager()

    def __str__(self):
        return "%s %s %s" % (self.name, self.updated_at, self.id)


class ScenarioRule(models.Model):
    scenario = models.ForeignKey(Scenario, on_delete=models.CASCADE, related_name="rules")
    name = models.CharField(max_length=255)
    priority = models.PositiveSmallIntegerField()
    color = ColorField(default=DEFAULT_COLOR)

    # This should match format for jsonlogic_to_exists_q_clauses in iaso.utils.jsonlogic
    # This should only support one level: e.g. {"and": [{"==": [{"var": "gender"}, "F"]}, {"<": [{"var": "age"}, 25]}]}
    matching_criteria = models.JSONField(blank=False, null=False)

    # Those fields are mainly used to keep track on org units setup in the UI.
    # Foreign keys to org units are managed by intervention_assignments.
    org_units_matched = ArrayField(models.IntegerField(), blank=True, default=list)  # from matching_criteria
    org_units_excluded = ArrayField(models.IntegerField(), blank=True, default=list)
    org_units_included = ArrayField(models.IntegerField(), blank=True, default=list)
    org_units_scope = ArrayField(models.IntegerField(), blank=True, default=list)

    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name="created_scenario_rules")
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        User, on_delete=models.PROTECT, related_name="updated_scenario_rules", null=True, blank=True
    )

    class Meta:
        app_label = "snt_malaria"
        ordering = ["-updated_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["scenario", "priority"],
                name="scenario_rule_priority_unique",
            )
        ]


class ScenarioRuleInterventionProperties(models.Model):
    scenario_rule = models.ForeignKey(ScenarioRule, on_delete=models.CASCADE, related_name="intervention_properties")
    intervention = models.ForeignKey("Intervention", on_delete=models.CASCADE, related_name="scenario_rule_properties")
    coverage = models.DecimalField(max_digits=3, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "snt_malaria"
        constraints = [
            models.UniqueConstraint(
                fields=["scenario_rule", "intervention"],
                name="scenario_rule_intervention_unique",
            ),
            models.CheckConstraint(
                check=Q(coverage__gte=0) & Q(coverage__lte=1), name="intervention_properties_coverage_between_0_and_1"
            ),
        ]
