import django.db.models.deletion

from django.db import migrations, models
from django.db.models import Exists, OuterRef


WORKSPACE_NAME_MAX_LENGTH = 255
OPENHEXA_ORIGIN = "openhexa"
ROOT_MODEL_NAMES = [
    "Scenario",
    "InterventionCategory",
    "CostUnitType",
    "Donor",
    "Grant",
    "CompositeLayer",
    "BudgetSettings",
]


def backfill_workspace_from_account(apps, schema_editor):
    Account = apps.get_model("iaso", "Account")
    Workspace = apps.get_model("iaso", "Workspace")
    root_models = [apps.get_model("snt_malaria", name) for name in ROOT_MODEL_NAMES]

    _create_missing_first_workspaces(Account, Workspace, apps.get_model("iaso", "MetricType"), root_models)

    first_workspace_id_by_account_id = dict(
        Workspace.objects.filter(deleted_at__isnull=True)
        .order_by("account_id", "id")
        .distinct("account_id")
        .values_list("account_id", "id")
    )
    for model in root_models:
        for account_id, workspace_id in first_workspace_id_by_account_id.items():
            model.objects.filter(account_id=account_id, workspace__isnull=True).update(workspace_id=workspace_id)


def _create_missing_first_workspaces(Account, Workspace, MetricType, root_models):
    """The IASO migration only covers accounts with the SNT module; some accounts hold SNT data without it."""
    account_ids_with_data = set()
    for model in root_models:
        account_ids_with_data.update(model.objects.values_list("account_id", flat=True).distinct())

    active_workspace = Workspace.objects.filter(account_id=OuterRef("id"), deleted_at__isnull=True)
    accounts_without_workspace = Account.objects.filter(id__in=account_ids_with_data).exclude(Exists(active_workspace))
    workspaces = Workspace.objects.bulk_create(
        Workspace(account=account, name=account.name[:WORKSPACE_NAME_MAX_LENGTH])
        for account in accounts_without_workspace
    )
    # Same split as the IASO migration did for the accounts it gave a workspace to.
    for workspace in workspaces:
        MetricType.objects.filter(account_id=workspace.account_id, workspace__isnull=True).exclude(
            origin=OPENHEXA_ORIGIN
        ).update(workspace=workspace)


class Migration(migrations.Migration):
    dependencies = [
        ("iaso", "0419_workspace"),
        ("snt_malaria", "0072_merge_20261029_0952"),
    ]

    operations = [
        migrations.AddField(
            model_name="budgetsettings",
            name="workspace",
            field=models.OneToOneField(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="budget_settings",
                to="iaso.workspace",
            ),
        ),
        migrations.AddField(
            model_name="compositelayer",
            name="workspace",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="snt_composite_layers",
                to="iaso.workspace",
            ),
        ),
        migrations.AddField(
            model_name="costunittype",
            name="workspace",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="snt_cost_unit_types",
                to="iaso.workspace",
            ),
        ),
        migrations.AddField(
            model_name="donor",
            name="workspace",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="snt_donors",
                to="iaso.workspace",
            ),
        ),
        migrations.AddField(
            model_name="grant",
            name="workspace",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="snt_grants",
                to="iaso.workspace",
            ),
        ),
        migrations.AddField(
            model_name="interventioncategory",
            name="workspace",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="snt_intervention_categories",
                to="iaso.workspace",
            ),
        ),
        migrations.AddField(
            model_name="scenario",
            name="workspace",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="snt_scenarios",
                to="iaso.workspace",
            ),
        ),
        migrations.RunPython(backfill_workspace_from_account, migrations.RunPython.noop),
    ]
