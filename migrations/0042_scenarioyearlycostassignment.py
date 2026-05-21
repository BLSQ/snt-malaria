import django.db.models.deletion

from django.db import migrations, models


def migrate_budget_assumptions_to_yearly_cost_assignments(apps, schema_editor):
    BudgetAssumptions = apps.get_model("snt_malaria", "BudgetAssumptions")
    InterventionCostBreakdownLine = apps.get_model("snt_malaria", "InterventionCostBreakdownLine")
    ScenarioYearlyCostAssignment = apps.get_model("snt_malaria", "ScenarioYearlyCostAssignment")
    db_alias = schema_editor.connection.alias

    cost_line_ids_by_intervention = {}
    for intervention_id, cost_line_id in InterventionCostBreakdownLine.objects.using(db_alias).values_list(
        "intervention_id", "id"
    ):
        cost_line_ids_by_intervention.setdefault(intervention_id, []).append(cost_line_id)

    first_assumption_by_scenario_intervention_year = {}
    assumptions = BudgetAssumptions.objects.using(db_alias).order_by(
        "scenario_id", "intervention_assignment__intervention_id", "year", "id"
    )

    for assumption in assumptions.iterator():
        intervention_id = assumption.intervention_assignment.intervention_id
        key = (assumption.scenario_id, intervention_id, assumption.year)
        if key not in first_assumption_by_scenario_intervention_year:
            first_assumption_by_scenario_intervention_year[key] = assumption.coverage

    yearly_assignments = []
    for (scenario_id, intervention_id, year), value in first_assumption_by_scenario_intervention_year.items():
        for cost_line_id in cost_line_ids_by_intervention.get(intervention_id, []):
            yearly_assignments.append(
                ScenarioYearlyCostAssignment(
                    scenario_id=scenario_id,
                    cost_line_id=cost_line_id,
                    year=year,
                    value=value,
                )
            )

    ScenarioYearlyCostAssignment.objects.using(db_alias).bulk_create(yearly_assignments, ignore_conflicts=True)


class Migration(migrations.Migration):
    dependencies = [
        ("snt_malaria", "0041_costunittype_and_costbreakdown_updates"),
    ]

    operations = [
        migrations.CreateModel(
            name="ScenarioYearlyCostAssignment",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("year", models.PositiveSmallIntegerField()),
                ("value", models.DecimalField(decimal_places=2, max_digits=19)),
                (
                    "cost_line",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="scenario_yearly_assignments",
                        to="snt_malaria.interventioncostbreakdownline",
                    ),
                ),
                (
                    "scenario",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="yearly_cost_assignments",
                        to="snt_malaria.scenario",
                    ),
                ),
            ],
        ),
        migrations.AddConstraint(
            model_name="scenarioyearlycostassignment",
            constraint=models.UniqueConstraint(
                fields=("scenario", "cost_line", "year"),
                name="scenario_yearly_cost_assignment_unique_per_line_year",
            ),
        ),
        migrations.RunPython(
            migrate_budget_assumptions_to_yearly_cost_assignments,
            migrations.RunPython.noop,
        ),
    ]
