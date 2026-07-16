from decimal import Decimal

from django.db import migrations, models


# Now that the conversion factor lives on the cost lines, the per-variant units
# are redundant and collapse into a single (singular) unit per kind. Kept in
# sync with LEGACY_UNIT_MAPPING in support/intervention_seeder.py.
UNIT_CONSOLIDATION = {
    "SMC 3 cycles": "SMC Blister Pack",
    "SMC 4 cycles": "SMC Blister Pack",
    "SMC 5 cycles": "SMC Blister Pack",
    "SP Tablet 0-1": "SP Tablet",
    "SP Tablet 1-2": "SP Tablet",
    "Days": "Day",
    "Each": "Item",
}

# The old descriptions explained the conversion, which now lives on the cost
# lines. Snapshot of COST_UNIT_TYPES in support/intervention_seeder.py.
UNIT_DESCRIPTIONS = {
    "Net": "A single insecticide-treated bed net",
    "Bale": "A bale contains 50 nets",
    "IPTp Blister Pack": "A single standard dose consists of a blister pack of 3 SP pills",
    "SMC Blister Pack": "A single monthly cycle course contains 1 SP and 3 AQ tablets",
    "SP Tablet": "A single tablet of sulfadoxine-pyrimethamine (SP)",
    "Vaccine dose": "A single dose of malaria vaccine",
    "Day": "A single day",
    "Item": "Default unit for items counted individually",
}

# Persisted Budget.results snapshots carry the unit-era key names; rename them
# to match the new line-level fields (see BudgetBreakdownItem).
BUDGET_RESULT_KEY_RENAMES = {
    "cost_unit_ratio": "conversion_factor",
    "cost_unit_inverted": "invert_conversion_factor",
}


def copy_unit_conversion_to_cost_lines(apps, schema_editor):
    CostUnitType = apps.get_model("snt_malaria", "CostUnitType")
    InterventionCostBreakdownLine = apps.get_model("snt_malaria", "InterventionCostBreakdownLine")
    db_alias = schema_editor.connection.alias

    for unit in CostUnitType.objects.using(db_alias).all():
        if unit.is_proportional:
            factor = unit.value if unit.value is not None else Decimal("1")
            invert = unit.invert_value
        else:
            factor = Decimal("1")
            invert = False

        InterventionCostBreakdownLine.objects.using(db_alias).filter(unit_type=unit).update(
            is_proportional=unit.is_proportional,
            conversion_factor=factor,
            invert_conversion_factor=invert,
        )

    # Lines that were population-driven stay proportional even when their unit was not.
    InterventionCostBreakdownLine.objects.using(db_alias).filter(population_layer__isnull=False).update(
        is_proportional=True
    )


def consolidate_variant_cost_units(apps, schema_editor):
    CostUnitType = apps.get_model("snt_malaria", "CostUnitType")
    InterventionCostBreakdownLine = apps.get_model("snt_malaria", "InterventionCostBreakdownLine")
    db_alias = schema_editor.connection.alias

    for old_name, new_name in UNIT_CONSOLIDATION.items():
        for unit in CostUnitType.objects.using(db_alias).filter(name=old_name):
            target = CostUnitType.objects.using(db_alias).filter(account_id=unit.account_id, name=new_name).first()
            if target is None:
                unit.name = new_name
                unit.save(update_fields=["name"])
            else:
                InterventionCostBreakdownLine.objects.using(db_alias).filter(unit_type=unit).update(unit_type=target)
                unit.delete()

    for name, description in UNIT_DESCRIPTIONS.items():
        CostUnitType.objects.using(db_alias).filter(name=name).update(description=description)


def _rename_keys(breakdown_item):
    for old_key, new_key in BUDGET_RESULT_KEY_RENAMES.items():
        if old_key in breakdown_item:
            breakdown_item[new_key] = breakdown_item.pop(old_key)


def rename_budget_result_conversion_keys(apps, schema_editor):
    Budget = apps.get_model("snt_malaria", "Budget")
    db_alias = schema_editor.connection.alias

    for budget in Budget.objects.using(db_alias).iterator():
        for year_result in budget.results or []:
            for intervention in year_result.get("interventions", []):
                for breakdown_item in intervention.get("cost_breakdown", []):
                    _rename_keys(breakdown_item)
            for org_unit in year_result.get("org_units_costs", []):
                for intervention in org_unit.get("interventions", []):
                    for breakdown_item in intervention.get("cost_breakdown", []):
                        _rename_keys(breakdown_item)
            for breakdown_item in year_result.get("category_costs", []):
                _rename_keys(breakdown_item)
        budget.save(update_fields=["results"])


class Migration(migrations.Migration):
    dependencies = [
        ("snt_malaria", "0054_compositelayer"),
    ]

    operations = [
        migrations.AddField(
            model_name="interventioncostbreakdownline",
            name="conversion_factor",
            field=models.DecimalField(decimal_places=6, default=Decimal("1"), max_digits=19),
        ),
        migrations.AddField(
            model_name="interventioncostbreakdownline",
            name="invert_conversion_factor",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="interventioncostbreakdownline",
            name="is_proportional",
            field=models.BooleanField(default=False),
        ),
        migrations.RunPython(
            copy_unit_conversion_to_cost_lines,
            migrations.RunPython.noop,
        ),
        migrations.RemoveField(
            model_name="costunittype",
            name="invert_value",
        ),
        migrations.RemoveField(
            model_name="costunittype",
            name="is_proportional",
        ),
        migrations.RemoveField(
            model_name="costunittype",
            name="value",
        ),
        migrations.RunPython(
            consolidate_variant_cost_units,
            migrations.RunPython.noop,
        ),
        migrations.RunPython(
            rename_budget_result_conversion_keys,
            migrations.RunPython.noop,
        ),
    ]
