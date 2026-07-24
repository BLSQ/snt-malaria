from django.db import IntegrityError
from django.db.models import ProtectedError
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers, viewsets
from rest_framework.exceptions import MethodNotAllowed

from plugins.snt_malaria.api.intervention_categories.permissions import InterventionCategoryPermission
from plugins.snt_malaria.api.intervention_categories.serializers import (
    InterventionCategorySerializer,
)
from plugins.snt_malaria.models import InterventionCategory


class InterventionCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = InterventionCategorySerializer
    ordering_fields = ["id", "name"]
    http_method_names = ["get", "post", "put", "patch", "delete", "head", "options"]
    permission_classes = [InterventionCategoryPermission]

    def get_queryset(self):
        return InterventionCategory.objects.prefetch_related("intervention_set").filter(
            account=self.request.user.iaso_profile.account
        )

    def perform_create(self, serializer):
        try:
            serializer.save(
                account=self.request.user.iaso_profile.account,
                created_by=self.request.user,
            )
        except IntegrityError as e:
            self._raise_for_integrity_error(e)

    def perform_update(self, serializer):
        try:
            serializer.save()
        except IntegrityError as e:
            self._raise_for_integrity_error(e)

    def perform_destroy(self, instance):
        # Categories referenced by an intervention are protected (on_delete=PROTECT),
        # so surface a clean 405 instead of an unhandled error.
        try:
            instance.delete()
        except ProtectedError:
            raise MethodNotAllowed(
                self.request.method,
                _("Cannot delete this intervention category because it is used by one or more interventions."),
            )

    @staticmethod
    def _raise_for_integrity_error(error):
        if "name_uniq" in str(error):
            raise serializers.ValidationError(
                {"name": _("An intervention category with this name already exists.")}
            )
        raise serializers.ValidationError(str(error))
