from rest_framework import permissions

from plugins.snt_malaria.models import Scenario
from plugins.snt_malaria.permissions import SNT_SCENARIO_BASIC_WRITE_PERMISSION, SNT_SCENARIO_FULL_WRITE_PERMISSION


class ScenarioPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if request.method in permissions.SAFE_METHODS:  # = GET for list, retrieve & export_csv
            return True

        # = POST for create, duplicate, import_from_csv, PUT, DELETE
        return user.has_perm(SNT_SCENARIO_BASIC_WRITE_PERMISSION.full_name()) or user.has_perm(
            SNT_SCENARIO_FULL_WRITE_PERMISSION.full_name()
        )

    def has_object_permission(self, request, view, obj: Scenario):
        if request.method in permissions.SAFE_METHODS:  # = GET for retrieve
            return True

        user = request.user
        if user.has_perm(SNT_SCENARIO_FULL_WRITE_PERMISSION.full_name()):  # PUT & DELETE
            return True

        # PUT & DELETE
        if user.has_perm(SNT_SCENARIO_BASIC_WRITE_PERMISSION.full_name()) and obj.created_by == user:
            return True

        # fallback for unexpected cases
        return False
