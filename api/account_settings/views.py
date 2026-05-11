from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from plugins.snt_malaria.api.account_settings.serializers import AccountSettingsSerializer
from plugins.snt_malaria.models import AccountSettings


class AccountSettingsViewSet(viewsets.ModelViewSet):
    serializer_class = AccountSettingsSerializer
    # Reads available to any authenticated user; writes restricted by queryset
    # to the user's own account (no global permission required).
    http_method_names = ["get", "patch", "head", "options"]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return AccountSettings.objects.filter(account=self.request.user.iaso_profile.account)
