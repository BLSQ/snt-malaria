from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("snt_malaria", "0050_accountsettings_default_population"),
    ]

    operations = [
        migrations.AddField(
            model_name="costunittype",
            name="is_proportional",
            field=models.BooleanField(default=True),
        ),
    ]
