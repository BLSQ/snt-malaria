from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from iaso.utils.workspace import get_active_workspace
from plugins.snt_malaria.models import Donor, Grant


class GrantSerializer(serializers.ModelSerializer):
    donor = serializers.PrimaryKeyRelatedField(queryset=Donor.objects.all())
    donor_name = serializers.CharField(source="donor.name", read_only=True)

    class Meta:
        model = Grant
        fields = ["id", "name", "short_name", "description", "amount", "donor", "donor_name"]
        read_only_fields = ["id", "donor_name"]

    def validate_donor(self, donor):
        if donor.workspace_id != get_active_workspace(self.context["request"]).id:
            raise serializers.ValidationError(_("Donor not found."))
        return donor
