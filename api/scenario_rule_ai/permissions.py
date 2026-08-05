from rest_framework import permissions

from plugins.snt_malaria.permissions import SNT_SCENARIO_BASIC_WRITE_PERMISSION, SNT_SCENARIO_FULL_WRITE_PERMISSION


class ScenarioRuleAIPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        return user.has_perm(SNT_SCENARIO_BASIC_WRITE_PERMISSION.full_name()) or user.has_perm(
            SNT_SCENARIO_FULL_WRITE_PERMISSION.full_name()
        )
