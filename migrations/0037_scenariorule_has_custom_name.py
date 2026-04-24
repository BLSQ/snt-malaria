from django.db import migrations, models


def mark_existing_rules_as_custom(apps, schema_editor):
    """
    Mark every pre-existing rule as custom so we don't retro-actively overwrite
    names that users may have hand-picked before `has_custom_name` existed. New
    rules continue to default to False (auto).
    """
    ScenarioRule = apps.get_model("snt_malaria", "ScenarioRule")
    ScenarioRule.objects.all().update(has_custom_name=True)


class Migration(migrations.Migration):
    dependencies = [
        ("snt_malaria", "0036_alter_impactproviderconfig_provider_key"),
    ]

    operations = [
        migrations.AddField(
            model_name="scenariorule",
            name="has_custom_name",
            field=models.BooleanField(default=False),
        ),
        migrations.RunPython(mark_existing_rules_as_custom, migrations.RunPython.noop),
    ]
