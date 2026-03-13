from rest_framework import viewsets

from plugins.snt_malaria.api.account_settings.serializers import AccountSettingsSerializer
from plugins.snt_malaria.models import AccountSettings


class AccountSettingsViewSet(viewsets.ModelViewSet):
    serializer_class = AccountSettingsSerializer
    http_method_names = ["get", "options"]

    def get_queryset(self):
        return AccountSettings.objects.filter(account=self.request.user.iaso_profile.account)
