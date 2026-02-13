from rest_framework import permissions

from plugins.snt_malaria.permissions import (
    SNT_SCENARIO_BASIC_WRITE_PERMISSION,
    SNT_SCENARIO_FULL_WRITE_PERMISSION,
)


class BudgetPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if request.method in permissions.SAFE_METHODS:
            return True

        # POST
        return user.has_perm(SNT_SCENARIO_BASIC_WRITE_PERMISSION.full_name()) or user.has_perm(
            SNT_SCENARIO_FULL_WRITE_PERMISSION.full_name()
        )
