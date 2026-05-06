from django.db import models

from plugins.snt_malaria.models.scenario import Scenario


class BudgetAssumptions(models.Model):
    """
    Budget assumptions scoped per scenario, intervention assignment, and year.
    Each assignment can have at most one assumption per year (enforced via DB constraint).
    """

    class Meta:
        app_label = "snt_malaria"
        constraints = [
            models.UniqueConstraint(
                fields=["scenario", "intervention_assignment", "year"],
                name="unique_budget_assumption_per_assignment_year",
            ),
        ]

    scenario = models.ForeignKey(Scenario, on_delete=models.CASCADE, related_name="budget_assumptions_set")
    intervention_assignment = models.ForeignKey(
        "snt_malaria.InterventionAssignment",
        on_delete=models.CASCADE,
        related_name="budget_assumptions",
        null=False,
        blank=False,
    )
    year = models.PositiveSmallIntegerField(null=False, blank=False)
    coverage = models.DecimalField(max_digits=3, decimal_places=2)
