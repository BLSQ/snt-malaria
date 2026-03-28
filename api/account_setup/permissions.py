from django.conf import settings
from rest_framework import permissions


class SNTAccountSetupPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        if settings.ENABLE_PUBLIC_ACCOUNT_SETUP:
            return True
        return False
