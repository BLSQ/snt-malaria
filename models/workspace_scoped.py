from iaso.models import Account, Workspace


WORKSPACE_NAME_MAX_LENGTH = 255


def get_or_create_first_workspace(account: Account, created_by=None) -> Workspace:
    workspace = Workspace.objects.filter(account=account).order_by("id").first()
    if workspace:
        return workspace
    return Workspace.objects.create(
        account=account, name=account.name[:WORKSPACE_NAME_MAX_LENGTH], created_by=created_by
    )


class WorkspaceFromAccountMixin:
    """Fills `workspace` from `account` while both FKs coexist (expand/contract); removed with the account FK."""

    def save(self, *args, **kwargs):
        if self.workspace_id is None and self.account_id is not None:
            self.workspace = get_or_create_first_workspace(self.account)
        super().save(*args, **kwargs)
