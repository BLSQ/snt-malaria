from dataclasses import dataclass

from django.db import models
from django.utils.translation import gettext_lazy as _

from iaso.modules import MODULE_SNT_MALARIA
from iaso.permissions.base import IasoPermission


@dataclass
class SNTPermission(IasoPermission):
    """
    Represents a SNT malaria plugin permission.
    """

    def full_name(self) -> str:
        return f"snt_malaria.{self.codename}"


# Groups displayed in the web interface
PERMISSION_GROUP_SNT = "snt_malaria"


# Add here any new saas permission - it must start with the "SNT_" prefix and end with "_PERMISSION"
SNT_SCENARIO_BASIC_WRITE_PERMISSION = SNTPermission(
    codename="iaso_snt_scenario_basic_write",
    label=_("Scenario - Basic Write"),
    module=MODULE_SNT_MALARIA,
    ui_group=PERMISSION_GROUP_SNT,
    ui_category="iaso_snt_scenario_permissions",
    ui_type_in_category="basic",
    ui_order_in_category=1,
)
SNT_SCENARIO_FULL_WRITE_PERMISSION = SNTPermission(
    codename="iaso_snt_scenario_full_write",
    label=_("Scenario - Full Write"),
    module=MODULE_SNT_MALARIA,
    ui_group=PERMISSION_GROUP_SNT,
    ui_category="iaso_snt_scenario_permissions",
    ui_type_in_category="full",
    ui_order_in_category=2,
)
SNT_SETTINGS_READ_PERMISSION = SNTPermission(
    codename="iaso_snt_settings_read",
    label=_("Settings - Read"),
    module=MODULE_SNT_MALARIA,
    ui_group=PERMISSION_GROUP_SNT,
    ui_category="iaso_snt_settings_permissions",
    ui_type_in_category="read",
    ui_order_in_category=1,
)
SNT_SETTINGS_WRITE_PERMISSION = SNTPermission(
    codename="iaso_snt_settings_write",
    label=_("Settings - Write"),
    module=MODULE_SNT_MALARIA,
    ui_group=PERMISSION_GROUP_SNT,
    ui_category="iaso_snt_settings_permissions",
    ui_type_in_category="write",
    ui_order_in_category=2,
)

permissions = {
    perm.codename: perm
    for variable_name, perm in globals().items()
    if variable_name.startswith("SNT_") and variable_name.endswith("_PERMISSION") and isinstance(perm, SNTPermission)
}


class SNTPermissionSupport(models.Model):
    class Meta:
        managed = False
        default_permissions = []
        permissions = [perm.model_permission() for perm in permissions.values()]


permission_models = [SNTPermissionSupport]
