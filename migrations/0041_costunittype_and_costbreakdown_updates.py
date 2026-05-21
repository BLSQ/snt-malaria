import django.db.models.deletion

from django.db import migrations, models


UNIT_TYPE_CHOICES = [
    ("PER_ITN", "per ITN"),
    ("PER_SP", "per SP"),
    ("PER_CHILD", "per child"),
    ("PER_DOSE", "per dose"),
    ("PER_SPAQ_3_11_MONTHS", "per SPAQ pack 3-11 month olds"),
    ("PER_SPAQ_12_59_MONTHS", "per SPAQ pack 12-59 month olds"),
    ("PER_SPAQ_5_10_YEARS", "per SPAQ pack 5-10 years olds"),
    ("PER_RDT_KIT", "per RDT kit"),
    ("PER_AL", "per AL"),
    ("PER_60MG_POWDER", "per 60mg powder"),
    ("PER_RAS", "per RAS"),
    ("PER_BALE", "per bale"),
    ("OTHER", "Other"),
]

UNIT_TYPE_LABEL_BY_KEY = dict(UNIT_TYPE_CHOICES)
UNIT_TYPE_KEY_BY_LABEL = {label: key for key, label in UNIT_TYPE_CHOICES}


def seed_cost_unit_types(apps, schema_editor):
    CostUnitType = apps.get_model("snt_malaria", "CostUnitType")
    InterventionCostBreakdownLine = apps.get_model("snt_malaria", "InterventionCostBreakdownLine")
    db_alias = schema_editor.connection.alias

    cost_unit_type_ids_by_account_and_key = {}

    def get_or_create_cost_unit_type_id(account_id, key):
        map_key = (account_id, key)
        if map_key not in cost_unit_type_ids_by_account_and_key:
            label = UNIT_TYPE_LABEL_BY_KEY.get(key, UNIT_TYPE_LABEL_BY_KEY["OTHER"])
            cost_unit_type_ids_by_account_and_key[map_key] = (
                CostUnitType.objects.using(db_alias)
                .create(
                    account_id=account_id,
                    name=label,
                )
                .id
            )
        return cost_unit_type_ids_by_account_and_key[map_key]

    for cost_line in (
        InterventionCostBreakdownLine.objects.using(db_alias)
        .select_related("intervention__intervention_category__account")
        .all()
        .iterator()
    ):
        account_id = cost_line.intervention.intervention_category.account_id
        legacy_key = getattr(cost_line, "legacy_unit_type", None) or "OTHER"
        cost_line.unit_type_fk_id = get_or_create_cost_unit_type_id(account_id, legacy_key)
        cost_line.save(update_fields=["unit_type_fk"], using=db_alias)


def restore_legacy_unit_types(apps, schema_editor):
    InterventionCostBreakdownLine = apps.get_model("snt_malaria", "InterventionCostBreakdownLine")
    db_alias = schema_editor.connection.alias

    for cost_line in (
        InterventionCostBreakdownLine.objects.using(db_alias).select_related("unit_type_fk").all().iterator()
    ):
        if cost_line.unit_type_fk_id:
            cost_line.legacy_unit_type = UNIT_TYPE_KEY_BY_LABEL.get(cost_line.unit_type_fk.name, "OTHER")
        else:
            cost_line.legacy_unit_type = "OTHER"
        cost_line.save(update_fields=["legacy_unit_type"], using=db_alias)


class Migration(migrations.Migration):
    dependencies = [
        ("iaso", "0380_metrictype_metric_kind"),
        ("snt_malaria", "0040_intervention_allowed_cost_unit_types"),
    ]

    operations = [
        migrations.CreateModel(
            name="CostUnitType",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=100)),
                ("ratio", models.DecimalField(blank=True, decimal_places=6, max_digits=19, null=True)),
                (
                    "account",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="cost_unit_types",
                        to="iaso.account",
                    ),
                ),
            ],
            options={
                "ordering": ["name"],
            },
        ),
        migrations.AddConstraint(
            model_name="costunittype",
            constraint=models.UniqueConstraint(
                fields=("account", "name"),
                name="snt_malaria_costunittype_account_name_uniq",
            ),
        ),
        migrations.RenameField(
            model_name="interventioncostbreakdownline",
            old_name="unit_type",
            new_name="legacy_unit_type",
        ),
        migrations.AddField(
            model_name="interventioncostbreakdownline",
            name="cost_driver",
            field=models.CharField(
                choices=[("population", "Population"), ("fixed_cost", "Fixed cost")],
                default="population",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="interventioncostbreakdownline",
            name="population_layer",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="cost_breakdown_lines",
                to="iaso.metrictype",
            ),
        ),
        migrations.AddField(
            model_name="interventioncostbreakdownline",
            name="unit_type_fk",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="cost_breakdown_lines",
                to="snt_malaria.costunittype",
            ),
        ),
        migrations.RunPython(seed_cost_unit_types, restore_legacy_unit_types),
        migrations.AlterField(
            model_name="interventioncostbreakdownline",
            name="unit_type_fk",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="cost_breakdown_lines",
                to="snt_malaria.costunittype",
            ),
        ),
        migrations.RemoveField(
            model_name="interventioncostbreakdownline",
            name="legacy_unit_type",
        ),
        migrations.RenameField(
            model_name="interventioncostbreakdownline",
            old_name="unit_type_fk",
            new_name="unit_type",
        ),
    ]
