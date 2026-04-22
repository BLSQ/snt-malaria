from django.db import models

from iaso.models.base import Account
from iaso.models.org_unit import OrgUnitType
from iaso.utils.org_units import get_valid_org_units_with_geography


def get_intervention_org_unit_type_id(account):
    """Return the configured intervention org unit type ID, or None if not set."""
    return getattr(
        getattr(account, "snt_account_settings", None),
        "intervention_org_unit_type_id",
        None,
    )


def get_intervention_org_units(account):
    """Return valid org units at the configured intervention level, or all valid geo org units as fallback."""
    qs = get_valid_org_units_with_geography(account)
    type_id = get_intervention_org_unit_type_id(account)
    if type_id:
        qs = qs.filter(org_unit_type_id=type_id)
    return qs


class AccountSettings(models.Model):
    """
    This model is used to store the settings for the SNT account.
    """

    account = models.OneToOneField(Account, on_delete=models.CASCADE, related_name="snt_account_settings")

    focus_org_unit_type = models.ForeignKey(
        OrgUnitType,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
        help_text="Higher-level org unit type (e.g. regions) used to focus/zoom the map.",
    )
    intervention_org_unit_type = models.ForeignKey(
        OrgUnitType,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
        help_text=(
            "Org unit type where interventions are deployed (e.g. districts). "
            "Scopes rule matching, CSV export/import, and form dropdowns."
        ),
    )
