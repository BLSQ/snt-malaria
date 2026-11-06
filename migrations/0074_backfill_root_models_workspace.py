from django.db import migrations
from django.db.models import Exists, OuterRef, Subquery


WORKSPACE_NAME_MAX_LENGTH = 255
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

    _create_missing_first_workspaces(Account, Workspace, root_models)

    first_workspace_id = Subquery(
        Workspace.objects.filter(account_id=OuterRef("account_id"), deleted_at__isnull=True)
        .order_by("id")
        .values("id")[:1]
    )
    for model in root_models:
        model.objects.filter(workspace__isnull=True).update(workspace_id=first_workspace_id)


def _create_missing_first_workspaces(Account, Workspace, root_models):
    """The IASO migration only covers accounts with the SNT module; some accounts hold SNT data without it."""
    account_ids_with_data = set()
    for model in root_models:
        account_ids_with_data.update(model.objects.values_list("account_id", flat=True).distinct())

    active_workspace = Workspace.objects.filter(account_id=OuterRef("id"), deleted_at__isnull=True)
    accounts_without_workspace = Account.objects.filter(id__in=account_ids_with_data).exclude(Exists(active_workspace))
    Workspace.objects.bulk_create(
        Workspace(account=account, name=account.name[:WORKSPACE_NAME_MAX_LENGTH])
        for account in accounts_without_workspace
    )


class Migration(migrations.Migration):
    dependencies = [
        ("iaso", "0415_create_first_snt_workspaces"),
        ("snt_malaria", "0073_add_workspace_to_root_models"),
    ]

    operations = [
        migrations.RunPython(backfill_workspace_from_account, migrations.RunPython.noop),
    ]
