from rest_framework import serializers

from plugins.snt_malaria.models import AccountSettings


class AccountSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccountSettings
        fields = [
            "id",
            "account",
            "focus_org_unit_type_id",
            "intervention_org_unit_type_id",
        ]
        read_only_fields = [
            "id",
            "account",
        ]
