from django.db import migrations


def migrate_year_zero_to_null(apps, schema_editor):
    """MetricValue.year=0 was written by metrics_importer.py for rows with no YEAR column,
    instead of the intended NULL ("timeless"). Backfill it to NULL, but where a NULL row already
    exists for the same (metric_type, org_unit) pair - e.g. from add_pop_metrics.py, which already
    writes year=None - drop the year=0 duplicate instead of converting it, so we don't end up with
    two "timeless" rows for the same pair."""
    MetricValue = apps.get_model("iaso", "MetricValue")
    db_alias = schema_editor.connection.alias

    null_pairs = set(
        MetricValue.objects.using(db_alias).filter(year__isnull=True).values_list("metric_type_id", "org_unit_id")
    )
    zero_values = MetricValue.objects.using(db_alias).filter(year=0).only("id", "metric_type_id", "org_unit_id")
    duplicate_ids = [mv.id for mv in zero_values if (mv.metric_type_id, mv.org_unit_id) in null_pairs]
    if duplicate_ids:
        MetricValue.objects.using(db_alias).filter(id__in=duplicate_ids).delete()

    MetricValue.objects.using(db_alias).filter(year=0).update(year=None)


class Migration(migrations.Migration):
    dependencies = [
        ("snt_malaria", "0059_compositelayer_legend_config_and_more"),
    ]

    operations = [
        migrations.RunPython(migrate_year_zero_to_null, migrations.RunPython.noop, elidable=True),
    ]
