from rest_framework import serializers

from iaso.models.org_unit import OrgUnitType
from plugins.snt_malaria.models import AccountSettings


class AccountSettingsSerializer(serializers.ModelSerializer):
    # Expose the FK columns as writable PK fields so PATCH callers can send
    # {"focus_org_unit_type_id": <id>, "intervention_org_unit_type_id": <id>}.
    focus_org_unit_type_id = serializers.PrimaryKeyRelatedField(
        source="focus_org_unit_type",
        queryset=OrgUnitType.objects.none(),
        required=False,
        allow_null=True,
    )
    intervention_org_unit_type_id = serializers.PrimaryKeyRelatedField(
        source="intervention_org_unit_type",
        queryset=OrgUnitType.objects.none(),
        required=False,
        allow_null=True,
    )

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

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Scope the OrgUnitType choices to the current user's account so PATCH
        # callers cannot bind a type that belongs to another account.
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user is not None and user.is_authenticated and hasattr(user, "iaso_profile"):
            scoped = OrgUnitType.objects.filter(projects__account=user.iaso_profile.account).distinct()
            self.fields["focus_org_unit_type_id"].queryset = scoped
            self.fields["intervention_org_unit_type_id"].queryset = scoped
