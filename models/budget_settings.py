from django.db import models

from iaso.utils.models.soft_deletable import (
    DefaultSoftDeletableManager,
    IncludeDeletedSoftDeletableManager,
    OnlyDeletedSoftDeletableManager,
    SoftDeletableModel,
)
from plugins.snt_malaria.models.workspace_scoped import WorkspaceFromAccountMixin


class BudgetSettings(WorkspaceFromAccountMixin, SoftDeletableModel):
    class Meta:
        app_label = "snt_malaria"

    account = models.OneToOneField("iaso.Account", on_delete=models.CASCADE, db_index=True)
    workspace = models.OneToOneField(
        "iaso.Workspace", null=True, blank=True, on_delete=models.CASCADE, related_name="budget_settings"
    )
    local_currency = models.CharField(max_length=3)
    exchange_rate = models.DecimalField(max_digits=20, decimal_places=10)
    inflation_rate = models.DecimalField(max_digits=20, decimal_places=10)
    buffer = models.DecimalField(max_digits=5, decimal_places=4, default="1.1")

    objects = DefaultSoftDeletableManager()
    objects_only_deleted = OnlyDeletedSoftDeletableManager()
    objects_include_deleted = IncludeDeletedSoftDeletableManager()
