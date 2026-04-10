from django.contrib.auth.models import User
from django.contrib.postgres.fields import ArrayField
from django.db import connection, models, transaction
from django.db.models import Deferrable, Q

from iaso.models import MetricValue
from iaso.utils.colors import DEFAULT_COLOR
from iaso.utils.jsonlogic import jsonlogic_to_exists_q_clauses
from iaso.utils.models.color import ColorField
from iaso.utils.models.soft_deletable import (
    DefaultSoftDeletableManager,
    IncludeDeletedSoftDeletableManager,
    OnlyDeletedSoftDeletableManager,
    SoftDeletableModel,
)
from iaso.utils.validators import JSONSchemaValidator
from plugins.snt_malaria.models.account_settings import get_intervention_org_unit_type_id, get_intervention_org_units


class Scenario(SoftDeletableModel):
    class Meta:
        app_label = "snt_malaria"
        ordering = ["-updated_at"]
        constraints = [
            models.CheckConstraint(
                check=models.Q(start_year__lte=models.F("end_year")),
                name="%(app_label)s_%(class)s_start_year_lte_end_year",
            ),
            models.UniqueConstraint(
                fields=["account", "name"],
                name="scenario_name_account_unique",
                condition=Q(deleted_at__isnull=True),
            ),
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
    def refresh_assignments(self, user: User) -> None:
        self.intervention_assignments.all().delete()
        new_assignments = {}
        for rule in self.rules.order_by("-priority"):
            rule.refresh_assignments(user, new_assignments)
        # Bump updated_at so the impact API cache (keyed on this timestamp) self-invalidates.
        self.save()


SCENARIO_RULE_MATCHING_CRITERIA_SCHEMA = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "oneOf": [
        {
            "type": "object",
            "required": ["and"],
            "additionalProperties": False,
            "properties": {
                "and": {"type": "array", "minItems": 1, "items": {"$ref": "#/$defs/condition"}},
            },
        },
        {
            "type": "object",
            "required": ["all"],
            "additionalProperties": False,
            "properties": {"all": {"const": True}},
        },
    ],
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


class ScenarioRuleQuerySet(models.QuerySet):
    def bulk_update_with_deferred_constraint(self, objs, fields, batch_size=None):
        """
        Use this to bulk update ScenarioRule whose priority have changed.
        Updating ScenarioRule priorities with vanilla bulk_update fails, because
        bulk_updates processes rows one by one, which does not respect the unicity constraint on scenario and priority.
        """
        with transaction.atomic():
            with connection.cursor() as cursor:
                cursor.execute("SET CONSTRAINTS scenario_rule_priority_unique DEFERRED")
            return super().bulk_update(objs, fields, batch_size)


class ScenarioRule(models.Model):
    scenario = models.ForeignKey(Scenario, on_delete=models.CASCADE, related_name="rules")
    name = models.CharField(max_length=255)
    priority = models.PositiveSmallIntegerField()
    color = ColorField(default=DEFAULT_COLOR)

    # Matching criteria determines how org units are selected for this rule:
    # - {"and": [...]} — jsonlogic criteria evaluated against MetricValues
    #                    (must match format for jsonlogic_to_exists_q_clauses, single nesting level only)
    # - {"all": true}  — matches every org unit that has MetricValues in the account
    # - null           — inclusion-only rule, org units come solely from org_units_included
    matching_criteria = models.JSONField(
        blank=True, null=True, validators=[JSONSchemaValidator(schema=SCENARIO_RULE_MATCHING_CRITERIA_SCHEMA)]
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

    objects = ScenarioRuleQuerySet.as_manager()

    class Meta:
        app_label = "snt_malaria"
        ordering = ["-updated_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["scenario", "priority"],
                name="scenario_rule_priority_unique",
                deferrable=Deferrable.IMMEDIATE,
            )
        ]

    def save(self, *args, **kwargs):
        self.clean_fields()  # forces validation checks when calling save() directly or indirectly (objects.create())
        super().save(*args, **kwargs)

    @staticmethod
    def resolve_matched_org_units(account, matching_criteria):
        """Evaluate matching_criteria and return the raw list of matched org unit IDs.

        This is the criteria-only result, before exclusion/inclusion overrides.
        - match-all: returns all valid org units at the configured intervention level.
        - criteria: evaluates against MetricValues, also scoped to the intervention level.
        """
        if matching_criteria is None:
            return []
        if isinstance(matching_criteria, dict) and matching_criteria.get("all"):
            return list(get_intervention_org_units(account).values_list("id", flat=True))
        metric_values = MetricValue.objects.filter(metric_type__account=account, org_unit_id__isnull=False)
        type_id = get_intervention_org_unit_type_id(account)
        if type_id:
            metric_values = metric_values.filter(org_unit__org_unit_type_id=type_id)
        q = jsonlogic_to_exists_q_clauses(matching_criteria, metric_values, "metric_type_id", "org_unit_id")
        return list(metric_values.filter(q).distinct().values_list("org_unit_id", flat=True))

    def _compute_org_unit_ids(self) -> set[int]:
        """Resolve the set of org unit ids this rule targets based on its matching mode."""
        if self.matching_criteria is None:
            return set(self.org_units_included)
        is_match_all = isinstance(self.matching_criteria, dict) and self.matching_criteria.get("all")
        matched = (
            set(self.resolve_matched_org_units(self.scenario.account, self.matching_criteria))
            if is_match_all
            else set(self.org_units_matched)
        )
        if not matched and not self.org_units_included:
            return set()
        return (matched - set(self.org_units_excluded)) | set(self.org_units_included)

    def refresh_assignments(self, user: User, previous_assignments: dict[int, set[int]]) -> None:
        # """
        # Refresh intervention assignment based on this rule.
        # This method should be called for each rule of a scenario, in the order of their priority (highest priority first),
        # and with a dict of previous assignments that is updated at each step to make sure that we don't create duplicate assignments for the same org unit and intervention category.

        # If a rule has two intervention of the same category, only the first one will be assigned.

        # previous_assignments is a dict where keys are intervention category ids and values are sets of org unit ids that already have an assignment for this category from a higher priority rule. This is used to make sure that we don't create multiple assignments for the same org unit and intervention category, as the rule priority should determine which intervention gets assigned in case of overlap.
        # This dict is updated in place with the new assignments created by this method.
        # """
        from plugins.snt_malaria.models.intervention import InterventionAssignment

        if not self.intervention_properties.exists():
            return

        org_unit_ids = self._compute_org_unit_ids()
        if not org_unit_ids:
            # No org units to assign to (no matched, included, or "match all" org units)
            return

        intervention_assignments_to_create = []
        for intervention_property in self.intervention_properties.select_related("intervention").all():
            category_id = intervention_property.intervention.intervention_category_id
            if category_id not in previous_assignments:
                previous_assignments[category_id] = set()

            previous_assignments_for_category = previous_assignments[category_id]
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
                        created_by=user,
                        scenario_id=self.scenario_id,
                    )
                )

                # Update the dict to keep track of this new assignment
                previous_assignments_for_category.add(org_unit_id)

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
