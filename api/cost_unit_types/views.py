from django.db import IntegrityError
from django.db.models import ProtectedError
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers, viewsets
from rest_framework.exceptions import MethodNotAllowed

from plugins.snt_malaria.api.cost_unit_types.permissions import CostUnitTypePermission
from plugins.snt_malaria.api.cost_unit_types.serializers import CostUnitTypeSerializer
from plugins.snt_malaria.models.cost_unit_type import CostUnitType


class CostUnitTypeViewSet(viewsets.ModelViewSet):
    serializer_class = CostUnitTypeSerializer
    ordering_fields = ["id", "name"]
    http_method_names = ["get", "post", "put", "patch", "delete", "head", "options"]
    permission_classes = [CostUnitTypePermission]

    def get_queryset(self):
        return CostUnitType.objects.filter(account=self.request.user.iaso_profile.account)

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

    def perform_destroy(self, instance):
        # Cost units referenced by a cost breakdown line are protected (on_delete=PROTECT),
        # so surface a clean 405 instead of an unhandled error.
        try:
            instance.delete()
        except ProtectedError:
            raise MethodNotAllowed(
                self.request.method,
                _("Cannot delete this cost unit because it is used by one or more cost lines."),
            )

    @staticmethod
    def _raise_for_integrity_error(error):
        if "account_name_uniq" in str(error).lower():
            raise serializers.ValidationError({"name": _("A cost unit with this name already exists.")})
        raise serializers.ValidationError(str(error))
