from rest_framework import permissions


# Account feature flag gating the composite layer editor (frontend and API).
SHOW_DEV_FEATURES = "SHOW_DEV_FEATURES"


class CompositeLayerPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and hasattr(user, "iaso_profile"))
