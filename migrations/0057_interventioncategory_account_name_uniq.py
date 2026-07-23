from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("snt_malaria", "0056_costunittype_is_commodity"),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name="interventioncategory",
            unique_together=set(),
        ),
        migrations.AddConstraint(
            model_name="interventioncategory",
            constraint=models.UniqueConstraint(
                fields=("account", "name"), name="snt_malaria_interventioncategory_account_name_uniq"
            ),
        ),
    ]
