import django.db.models.deletion

from django.db import migrations, models


def copy_to_focus_org_unit_type(apps, schema_editor):
    AccountSettings = apps.get_model("snt_malaria", "AccountSettings")
    for settings in AccountSettings.objects.filter(intervention_org_unit_type__isnull=False):
        settings.focus_org_unit_type = settings.intervention_org_unit_type
        settings.save(update_fields=["focus_org_unit_type"])


class Migration(migrations.Migration):
    dependencies = [
        ("snt_malaria", "0031_allow_nullable_matching_criteria"),
    ]

    operations = [
        # 1. Add the new focus field (starts NULL).
        migrations.AddField(
            model_name="accountsettings",
            name="focus_org_unit_type",
            field=models.ForeignKey(
                blank=True,
                help_text="Higher-level org unit type (e.g. regions) used to focus/zoom the map.",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="+",
                to="iaso.orgunittype",
            ),
        ),
        # 2. Copy existing values: old intervention_org_unit_type -> focus_org_unit_type.
        migrations.RunPython(copy_to_focus_org_unit_type, migrations.RunPython.noop),
        # 3. Drop the old field (and its index) cleanly.
        migrations.RemoveField(
            model_name="accountsettings",
            name="intervention_org_unit_type",
        ),
        # 4. Re-add intervention_org_unit_type with its new meaning (deployment level).
        migrations.AddField(
            model_name="accountsettings",
            name="intervention_org_unit_type",
            field=models.ForeignKey(
                blank=True,
                help_text=(
                    "Org unit type where interventions are deployed (e.g. districts). "
                    "Scopes rule matching, CSV export/import, and form dropdowns."
                ),
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="+",
                to="iaso.orgunittype",
            ),
        ),
    ]
