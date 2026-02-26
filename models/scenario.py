from django.contrib.auth.models import User
from django.contrib.postgres.fields import ArrayField
from django.db import models, transaction
from django.db.models import Q

from iaso.utils.colors import DEFAULT_COLOR
from iaso.utils.models.color import ColorField
from iaso.utils.models.soft_deletable import (
    DefaultSoftDeletableManager,
    IncludeDeletedSoftDeletableManager,
    OnlyDeletedSoftDeletableManager,
    SoftDeletableModel,
)
from iaso.utils.validators import JSONSchemaValidator


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
    objects_only_deleted = OnlyDeletedSoftDeletableManager()
    objects_include_deleted = IncludeDeletedSoftDeletableManager()

    def __str__(self):
        return "%s %s %s" % (self.name, self.updated_at, self.id)

    def get_next_available_priority(self):
        """
        Returns the highest priority of existing rules + 1, or 1 if there is no rule yet.
        The rule with the highest number has the highest priority, meaning that its assignments
        will be applied first and will block the ones from other rules in case of conflicts.
        """
        if not self.rules.exists():
            return 1
        return self.rules.aggregate(max_priority=models.Max("priority"))["max_priority"] + 1

    @transaction.atomic()
    def refresh_assignments(self):
        self.intervention_assignments.all().delete()
        new_assignments = {}
        for rule in self.rules.all():
            rule.refresh_assignments(new_assignments)


SCENARIO_RULE_MATCHING_CRITERIA_SCHEMA = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "required": ["and"],
    "additionalProperties": False,
    "properties": {"and": {"type": "array", "minItems": 1, "items": {"$ref": "#/$defs/condition"}}},
    "$defs": {
        "condition": {
            "type": "object",
            "minProperties": 1,
            "maxProperties": 1,
            "additionalProperties": False,
            "patternProperties": {
                "^(==|<=|>=|<|>)$": {
                    "type": "array",
                    "minItems": 2,
                    "maxItems": 2,
                    "items": [{"$ref": "#/$defs/varObject"}, {"$ref": "#/$defs/value"}],
                }
            },
        },
        "varObject": {
            "type": "object",
            "required": ["var"],
            "additionalProperties": False,
            "properties": {"var": {"type": "integer"}},
        },
        "value": {
            "anyOf": [{"type": "string", "minLength": 1}, {"type": "number"}, {"type": "integer"}, {"type": "boolean"}]
        },
    },
}


class ScenarioRule(models.Model):
    scenario = models.ForeignKey(Scenario, on_delete=models.CASCADE, related_name="rules")
    name = models.CharField(max_length=255)
    priority = models.PositiveSmallIntegerField()
    color = ColorField(default=DEFAULT_COLOR)

    # This should match format for jsonlogic_to_exists_q_clauses in iaso.utils.jsonlogic
    # This should only support one level: e.g. {"and": [{"==": [{"var": "gender"}, "F"]}, {"<": [{"var": "age"}, 25]}]}
    matching_criteria = models.JSONField(
        blank=False, null=False, validators=[JSONSchemaValidator(schema=SCENARIO_RULE_MATCHING_CRITERIA_SCHEMA)]
    )

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

    def save(self, *args, **kwargs):
        self.clean_fields()  # forces validation checks when calling save() directly or indirectly (objects.create())
        super().save(*args, **kwargs)

    def refresh_assignments(self, previous_assignments: dict[int, set[int]]) -> None:
        # """
        # Refresh intervention assignment based on this rule.
        # This method should be called for each rule of a scenario, in the order of their priority (highest priority first),
        # and with a dict of previous assignments that is updated at each step to make sure that we don't create duplicate assignments for the same org unit and intervention category.

        # If a rule has two intervention of the same category, only the first one will be assigned.

        # previous_assignments is a dict where keys are intervention category ids and values are sets of org unit ids that already have an assignment for this category from a higher priority rule. This is used to make sure that we don't create multiple assignments for the same org unit and intervention category, as the rule priority should determine which intervention gets assigned in case of overlap.
        # This dict is updated in place with the new assignments created by this method.
        # """
        from plugins.snt_malaria.models.intervention import InterventionAssignment

        if (not self.intervention_properties.exists()) or (not self.org_units_matched):
            # If there is no intervention property or no matched org unit,
            # we don't need to do anything as there will be no assignment from this rule
            return

        org_unit_ids = set(self.org_units_matched) - set(self.org_units_excluded) | set(self.org_units_included)
        intervention_assignments_to_create = []
        for intervention_property in self.intervention_properties.prefetch_related("intervention").all():
            previous_assignments_for_category = previous_assignments.get(
                intervention_property.intervention.intervention_category_id, set()
            )
            for org_unit_id in org_unit_ids:
                if org_unit_id in previous_assignments_for_category:
                    # This means that a higher priority rule already assigned an intervention for this category and org unit, so we skip creating this assignment
                    continue

                # Create the assignment
                intervention_assignments_to_create.append(
                    InterventionAssignment(
                        rule=self,
                        intervention_id=intervention_property.intervention_id,
                        org_unit_id=org_unit_id,
                        coverage=intervention_property.coverage,
                        created_by=self.created_by,
                        scenario_id=self.scenario_id,
                    )
                )
                # Update the dict to keep track of this new assignment
                if intervention_property.intervention.intervention_category_id not in previous_assignments:
                    previous_assignments[intervention_property.intervention.intervention_category_id] = set()
                previous_assignments[intervention_property.intervention.intervention_category_id].add(org_unit_id)

        InterventionAssignment.objects.bulk_create(intervention_assignments_to_create)


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
