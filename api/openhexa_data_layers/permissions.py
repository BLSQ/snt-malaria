from rest_framework import permissions

from plugins.snt_malaria.permissions import SNT_SETTINGS_READ_PERMISSION, SNT_SETTINGS_WRITE_PERMISSION


class OpenHexaDataLayerPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated or not hasattr(user, "iaso_profile"):
            return False
        if request.method in permissions.SAFE_METHODS:
            return user.has_perm(SNT_SETTINGS_READ_PERMISSION.full_name()) or user.has_perm(
                SNT_SETTINGS_WRITE_PERMISSION.full_name()
            )
        # Importing a data layer writes MetricType + MetricValue rows.
        return user.has_perm(SNT_SETTINGS_WRITE_PERMISSION.full_name())
