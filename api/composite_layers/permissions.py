from rest_framework import permissions

from plugins.snt_malaria.permissions import SNT_SETTINGS_READ_PERMISSION, SNT_SETTINGS_WRITE_PERMISSION


# Account feature flag gating the composite layer editor (frontend and API).
SHOW_DEV_FEATURES = "SHOW_DEV_FEATURES"


class CompositeLayerPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated or not hasattr(user, "iaso_profile"):
            return False

        if request.method in permissions.SAFE_METHODS:
            return user.has_perm(SNT_SETTINGS_READ_PERMISSION.full_name()) or user.has_perm(
                SNT_SETTINGS_WRITE_PERMISSION.full_name()
            )

        # POST / PATCH / DELETE (including preview)
        return user.has_perm(SNT_SETTINGS_WRITE_PERMISSION.full_name())
