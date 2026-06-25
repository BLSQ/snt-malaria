from rest_framework import serializers

from iaso.models.metric import MetricType
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
    default_population_id = serializers.PrimaryKeyRelatedField(
        source="default_population",
        queryset=MetricType.objects.none(),
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
            "default_population_id",
        ]
        read_only_fields = [
            "id",
            "account",
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Scope choices to the current user's account so PATCH callers cannot
        # bind objects that belong to another account.
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user is not None and user.is_authenticated and hasattr(user, "iaso_profile"):
            account = user.iaso_profile.account
            scoped_out = OrgUnitType.objects.filter(projects__account=account).distinct()
            self.fields["focus_org_unit_type_id"].queryset = scoped_out
            self.fields["intervention_org_unit_type_id"].queryset = scoped_out
            self.fields["default_population_id"].queryset = MetricType.objects.filter(account=account)
