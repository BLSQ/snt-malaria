from django.db import models

from iaso.utils.models.soft_deletable import SoftDeletableModel


class BudgetSettings(SoftDeletableModel):
    class Meta:
        app_label = "snt_malaria"

    account = models.ForeignKey("iaso.Account", on_delete=models.CASCADE)
    local_currency = models.CharField(max_length=3)
    exchange_rate = models.DecimalField(max_digits=10, decimal_places=2)
    inflation_rate = models.DecimalField(max_digits=10, decimal_places=2)
