from rest_framework import permissions

from plugins.snt_malaria.permissions import SNT_SETTINGS_READ_PERMISSION, SNT_SETTINGS_WRITE_PERMISSION


class InterventionCostBreakdownLinePermission(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if request.method in permissions.SAFE_METHODS:
            return user.has_perm(SNT_SETTINGS_READ_PERMISSION.full_name()) or user.has_perm(
                SNT_SETTINGS_WRITE_PERMISSION.full_name()
            )

        # POST
        return user.has_perm(SNT_SETTINGS_WRITE_PERMISSION.full_name())
