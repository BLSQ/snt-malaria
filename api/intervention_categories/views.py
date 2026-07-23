from django.db import IntegrityError
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
        # The category is soft-deleted, so the intervention_category FK's
        # on_delete=PROTECT never fires here; check for active interventions
        # ourselves to avoid silently orphaning them from category listings.
        if instance.intervention_set.exists():
            raise MethodNotAllowed(
                self.request.method,
                _("Cannot delete this intervention category because it is used by one or more interventions."),
            )
        instance.delete()

    @staticmethod
    def _raise_for_integrity_error(error):
        if "name_uniq" in str(error):
            raise serializers.ValidationError(
                {"name": _("An intervention category with this name already exists.")}
            )
        raise serializers.ValidationError(str(error))
