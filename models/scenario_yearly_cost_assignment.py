from django.db import models


class ScenarioYearlyCostAssignment(models.Model):
    class Meta:
        app_label = "snt_malaria"
        constraints = [
            models.UniqueConstraint(
                fields=["scenario", "cost_line", "year"],
                name="scenario_yearly_cost_assignment_unique_per_line_year",
            )
        ]

    scenario = models.ForeignKey(
        "snt_malaria.Scenario",
        on_delete=models.CASCADE,
        related_name="yearly_cost_assignments",
    )
    cost_line = models.ForeignKey(
        "snt_malaria.InterventionCostBreakdownLine",
        on_delete=models.CASCADE,
        related_name="scenario_yearly_assignments",
    )
    year = models.PositiveSmallIntegerField()
    value = models.DecimalField(max_digits=19, decimal_places=2)

    def __str__(self):
        return f"{self.scenario_id}:{self.cost_line_id}:{self.year}"
