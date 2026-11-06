from iaso.models import Workspace


WORKSPACE_NAME_MAX_LENGTH = 255


def get_or_create_first_workspace(account_id: int) -> Workspace:
    workspace = Workspace.objects.filter(account_id=account_id).order_by("id").first()
    if workspace:
        return workspace

    from iaso.models import Account

    account = Account.objects.get(id=account_id)
    return Workspace.objects.create(account=account, name=account.name[:WORKSPACE_NAME_MAX_LENGTH])


class WorkspaceFromAccountMixin:
    """Fills `workspace` from `account` while both FKs coexist (expand/contract); removed with the account FK."""

    def save(self, *args, **kwargs):
        if self.workspace_id is None and self.account_id is not None:
            self.workspace = get_or_create_first_workspace(self.account_id)
        super().save(*args, **kwargs)
