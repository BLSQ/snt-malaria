from django.db import models

from iaso.models.base import Account
from iaso.models.org_unit import OrgUnitType


class AccountSettings(models.Model):
    """
    This model is used to store the settings for the SNT account.
    """

    account = models.OneToOneField(Account, on_delete=models.CASCADE, related_name="snt_account_settings")

    # This is used to build the org unit dropdown which allows to focus on a specific branch of the org unit tree.
    # It should be set to the org unit type id of the branch we want to focus on.
    intervention_org_unit_type = models.ForeignKey(OrgUnitType, null=True, blank=True, on_delete=models.SET_NULL)
