from iaso.models import Workspace
from iaso.utils.workspace import get_active_workspace


class WorkspaceScopedViewSetMixin:
    """Limits a viewset to the active workspace.

    `workspace_lookup` is the path from the viewset's model to its workspace: "workspace" for root
    models, a related path such as "scenario__workspace" for their children.
    """

    workspace_lookup = "workspace"

    @property
    def workspace(self) -> Workspace:
        return get_active_workspace(self.request)

    def get_queryset(self):
        queryset = super().get_queryset()
        if getattr(self, "swagger_fake_view", False):
            return queryset.none()
        return queryset.filter(**{self.workspace_lookup: self.workspace})

    def workspace_save_kwargs(self) -> dict:
        # `account` is still a required column on root models until the account FKs are dropped.
        return {"workspace": self.workspace, "account": self.workspace.account}
