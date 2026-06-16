from django.db import IntegrityError
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers, viewsets

from plugins.snt_malaria.api.grants.permissions import GrantPermission
from plugins.snt_malaria.api.grants.serializers import GrantSerializer
from plugins.snt_malaria.models import Grant


class GrantViewSet(viewsets.ModelViewSet):
    serializer_class = GrantSerializer
    ordering_fields = ["id", "name"]
    http_method_names = ["get", "post", "put", "patch", "delete", "head", "options"]
    permission_classes = [GrantPermission]

    def get_queryset(self):
        return Grant.objects.select_related("donor").filter(account=self.request.user.iaso_profile.account)

    def perform_create(self, serializer):
        try:
            serializer.save(account=self.request.user.iaso_profile.account)
        except IntegrityError as e:
            self._raise_for_integrity_error(e)

    def perform_update(self, serializer):
        try:
            serializer.save()
        except IntegrityError as e:
            self._raise_for_integrity_error(e)

    # Deleting a grant unassigns it from any interventions/assignments
    # (grant FK uses on_delete=SET_NULL), so the default destroy is sufficient.

    @staticmethod
    def _raise_for_integrity_error(error):
        if "name_uniq" in str(error):
            raise serializers.ValidationError({"name": _("A grant with this name already exists.")})
        raise serializers.ValidationError(str(error))
