from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("snt_malaria", "0048_scenariorule_interventions_remove_scenarioruleinterventionproperties"),
    ]

    operations = [
        migrations.AddField(
            model_name="budgetsettings",
            name="buffer",
            field=models.DecimalField(decimal_places=4, default="1.1", max_digits=5),
        ),
    ]
