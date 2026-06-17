from django.db import migrations, models


def migrate_intervention_properties_to_m2m(apps, schema_editor):
    ScenarioRuleInterventionProperties = apps.get_model("snt_malaria", "ScenarioRuleInterventionProperties")
    ScenarioRule = apps.get_model("snt_malaria", "ScenarioRule")

    for rule in ScenarioRule.objects.all():
        intervention_ids = ScenarioRuleInterventionProperties.objects.filter(
            scenario_rule=rule
        ).values_list("intervention_id", flat=True)
        rule.interventions.set(intervention_ids)


class Migration(migrations.Migration):

    dependencies = [
        ("snt_malaria", "0047_donor_grant_intervention_grant_and_more"),
        ("snt_malaria", "0047_remove_budget_assumptions_remove_budget_cost_input_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="scenariorule",
            name="interventions",
            field=models.ManyToManyField(blank=True, related_name="scenario_rules", to="snt_malaria.intervention"),
        ),
        migrations.RunPython(migrate_intervention_properties_to_m2m, migrations.RunPython.noop),
        migrations.DeleteModel(
            name="ScenarioRuleInterventionProperties",
        ),
    ]
