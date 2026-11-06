from django.db import IntegrityError
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers, viewsets

from plugins.snt_malaria.api.donors.permissions import DonorPermission
from plugins.snt_malaria.api.donors.serializers import DonorSerializer
from plugins.snt_malaria.api.workspace_scoped import WorkspaceScopedViewSetMixin
from plugins.snt_malaria.models import Donor


class DonorViewSet(WorkspaceScopedViewSetMixin, viewsets.ModelViewSet):
    queryset = Donor.objects.all()
    serializer_class = DonorSerializer
    ordering_fields = ["id", "name"]
    # List + create only: donors are created inline from the grant form.
    http_method_names = ["get", "post", "head", "options"]
    permission_classes = [DonorPermission]

    def perform_create(self, serializer):
        try:
            serializer.save(**self.workspace_save_kwargs())
        except IntegrityError as e:
            if "name_uniq" in str(e):
                raise serializers.ValidationError({"name": _("A donor with this name already exists.")})
            raise serializers.ValidationError(str(e))
