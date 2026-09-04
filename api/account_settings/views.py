from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated

from plugins.snt_malaria.api.account_settings.serializers import AccountSettingsSerializer
from plugins.snt_malaria.models import AccountSettings
from plugins.snt_malaria.permissions import SNT_SETTINGS_WRITE_PERMISSION


class AccountSettingsViewSet(viewsets.ModelViewSet):
    serializer_class = AccountSettingsSerializer
    # GET scoped to the user's own account by `get_queryset`. Both POST and PATCH
    # are open to any authenticated user as long as they only fill in fields that
    # are currently unset (initial setup wizard); modifying or clearing already-
    # set fields requires `SNT_SETTINGS_WRITE_PERMISSION`. POST upserts the
    # account's singleton row so callers can save without first knowing its id.
    http_method_names = ["get", "post", "patch", "head", "options"]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return AccountSettings.objects.filter(account=self.request.user.iaso_profile.account)

    def guard_field_changes(self, serializer):
        if self.request.user.has_perm(SNT_SETTINGS_WRITE_PERMISSION.full_name()):
            return
        instance = serializer.instance
        for field, new_value in serializer.validated_data.items():
            current = getattr(instance, field, None)
            if current is not None and new_value != current:
                raise PermissionDenied(
                    "Modifying an already-set account setting requires the SNT settings write permission."
                )

    def perform_update(self, serializer):
        self.guard_field_changes(serializer)
        serializer.save()

    def perform_create(self, serializer):
        account = self.request.user.iaso_profile.account
        existing = self.get_queryset().first()
        if existing is not None:
            serializer.instance = existing
            self.guard_field_changes(serializer)
        serializer.instance, _ = AccountSettings.objects.update_or_create(
            account=account,
            defaults=serializer.validated_data,
        )
