from django.db import models

from iaso.utils.models.soft_deletable import SoftDeletableModel


class BudgetSettings(SoftDeletableModel):
    class Meta:
        app_label = "snt_malaria"

    account = models.OneToOneField("iaso.Account", on_delete=models.CASCADE, db_index=True)
    local_currency = models.CharField(max_length=3)
    exchange_rate = models.DecimalField(max_digits=20, decimal_places=10)
    inflation_rate = models.DecimalField(max_digits=20, decimal_places=10)
