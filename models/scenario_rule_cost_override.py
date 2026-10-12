from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q


OVERRIDE_VALUE_FIELDS = ("unit_cost", "conversion_factor", "buffer", "coverage")
BASIS_DEPENDENT_FIELDS = ("conversion_factor", "coverage")


class ScenarioRuleCostOverrideQuerySet(models.QuerySet):
    def without_values(self):
        return self.filter(**{f"{field}__isnull": True for field in OVERRIDE_VALUE_FIELDS})

    def reset_basis_dependent(self, cost_line_ids):
        """Drops the values whose unit depends on whether the cost line is fixed or population-based."""
        overrides = self.filter(cost_line_id__in=cost_line_ids)
        overrides.filter(year__isnull=False).delete()
        overrides.update(**{field: None for field in BASIS_DEPENDENT_FIELDS})
        overrides.without_values().delete()

    def delete_for_cost_lines(self, cost_line_ids):
        self.filter(cost_line_id__in=cost_line_ids).delete()


class ScenarioRuleCostOverride(models.Model):
    """Cost line values a scenario rule uses for one of its interventions.

    The nullable `year` turns one table into two levels of overrides:

    - `year` is null: the all-years override. Its values apply to every year of the scenario.
    - `year` is set: a yearly override. Its values take precedence over the all-years row for that
      year only.

    Every value field is nullable and resolved field by field, so a null value falls back to the
    next level: yearly row, then all-years row, then the cost line itself (and for `buffer`, the
    account's budget settings). See `BudgetCalculationService._resolve`.

    `coverage` follows the cost line's meaning: a percentage of the population layer for
    proportional lines, the quantity costed per year for fixed lines.

    The API currently only writes `coverage` on yearly rows (the per-year coverage or quantity of a
    cost line). The schema and the budget resolution already treat every value field the same on
    both levels, so yearly unit cost, conversion factor or buffer overrides only need the API to
    accept them.

    A yearly coverage also decides whether the year is costed at all: it applies even in a year the
    rule does not deploy the intervention in, and a value of 0 skips a deployed year.
    """

    rule_intervention = models.ForeignKey(
        "snt_malaria.ScenarioRuleIntervention", on_delete=models.CASCADE, related_name="cost_overrides"
    )
    cost_line = models.ForeignKey(
        "snt_malaria.InterventionCostBreakdownLine", on_delete=models.CASCADE, related_name="rule_overrides"
    )
    year = models.PositiveSmallIntegerField(null=True, blank=True)
    unit_cost = models.DecimalField(
        max_digits=19, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(Decimal("0"))]
    )
    conversion_factor = models.DecimalField(
        max_digits=19, decimal_places=6, null=True, blank=True, validators=[MinValueValidator(Decimal("0"))]
    )
    buffer = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(Decimal("0"))]
    )
    coverage = models.DecimalField(
        max_digits=19, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(Decimal("0"))]
    )

    objects = ScenarioRuleCostOverrideQuerySet.as_manager()

    class Meta:
        app_label = "snt_malaria"
        # NULLs are distinct in unique constraints, so the all-years row needs its own partial constraint.
        constraints = [
            models.UniqueConstraint(
                fields=["rule_intervention", "cost_line", "year"],
                condition=Q(year__isnull=False),
                name="scenario_rule_cost_override_unique_per_year",
            ),
            models.UniqueConstraint(
                fields=["rule_intervention", "cost_line"],
                condition=Q(year__isnull=True),
                name="scenario_rule_cost_override_unique_all_years",
            ),
        ]

    def __str__(self):
        return f"{self.rule_intervention_id}:{self.cost_line_id}:{self.year or 'all'}"
