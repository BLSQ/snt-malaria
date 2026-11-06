from iaso.models import Account, Workspace


WORKSPACE_NAME_MAX_LENGTH = 255


def get_or_create_first_workspace(account: Account, created_by=None) -> Workspace:
    workspace = Workspace.objects.filter(account=account).order_by("id").first()
    if workspace:
        return workspace
    return Workspace.objects.create(
        account=account, name=account.name[:WORKSPACE_NAME_MAX_LENGTH], created_by=created_by
    )
