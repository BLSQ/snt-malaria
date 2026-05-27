from django.db import migrations


# We don't set the cost_driver here, as legacy data is always for Population cost drivers.
def set_population_layer_from_target_population(apps, schema_editor):
    InterventionCostBreakdownLine = apps.get_model("snt_malaria", "InterventionCostBreakdownLine")
    MetricType = apps.get_model("iaso", "MetricType")
    db_alias = schema_editor.connection.alias

    lines = list(
        InterventionCostBreakdownLine.objects.using(db_alias)
        .select_related("intervention__intervention_category__account")
        .filter(population_layer__isnull=True)
    )

    to_update = []
    for line in lines:
        target_population = line.intervention.target_population
        if not target_population:
            continue

        account = line.intervention.intervention_category.account
        code = target_population[0]

        try:
            metric_type = MetricType.objects.using(db_alias).get(account=account, code=code)
        except MetricType.DoesNotExist:
            continue

        line.population_layer = metric_type
        to_update.append(line)

    if to_update:
        InterventionCostBreakdownLine.objects.using(db_alias).bulk_update(to_update, ["population_layer"])


class Migration(migrations.Migration):
    dependencies = [
        ("snt_malaria", "0043_remove_intervention_allowed_cost_unit_types"),
    ]

    operations = [
        migrations.RunPython(
            set_population_layer_from_target_population,
            migrations.RunPython.noop,
        ),
    ]
