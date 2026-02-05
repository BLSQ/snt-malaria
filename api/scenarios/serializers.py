import pandas as pd

from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from iaso.api.common import UserSerializer
from iaso.utils.org_units import get_valid_org_units_with_geography
from plugins.snt_malaria.api.scenarios.utils import (
    get_interventions,
    get_missing_headers,
)
from plugins.snt_malaria.models import Scenario
from plugins.snt_malaria.models.intervention import InterventionAssignment


class ScenarioSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)

    class Meta:
        model = Scenario
        fields = [
            "id",
            "created_by",
            "name",
            "description",
            "created_at",
            "updated_at",
            "start_year",
            "end_year",
            "is_locked",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]

    def validate_name(self, value):
        if not value:
            raise serializers.ValidationError(_("Name cannot be empty."))

        # If we update, we don't want to check for duplicates as long as the name is not changed
        if self.instance is not None and self.instance.name == value:
            return value

        request = self.context.get("request")
        account = request.user.iaso_profile.account

        if Scenario.objects.filter(name=value, account=account).exists():
            raise serializers.ValidationError(_("A scenario with this name already exists for your account."))

        return value


class DuplicateScenarioSerializer(serializers.ModelSerializer):
    scenario_to_duplicate = serializers.PrimaryKeyRelatedField(queryset=Scenario.objects.none(), required=True)
    name = serializers.CharField(required=True)
    description = serializers.CharField(required=False, allow_blank=True)
    start_year = serializers.IntegerField(required=True)
    end_year = serializers.IntegerField(required=True)

    class Meta:
        model = Scenario
        fields = ["scenario_to_duplicate", "name", "description", "start_year", "end_year"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user and user.is_authenticated:
            account = user.iaso_profile.account
            self.fields["scenario_to_duplicate"].queryset = Scenario.objects.filter(account=account)

    def save(self, **kwargs):
        scenario_to_duplicate = self.validated_data.pop("scenario_to_duplicate", None)
        scenario = super().save(**self.validated_data, **kwargs)

        assignments = InterventionAssignment.objects.filter(scenario_id=scenario_to_duplicate.id)
        for assignment in assignments:
            assignment.pk = None
            assignment.scenario = scenario
            assignment.save()

        return scenario


class ImportScenarioSerializer(serializers.Serializer):
    file = serializers.FileField(required=True)

    def validate_file(self, value):
        if not value.name.endswith(".csv"):
            raise serializers.ValidationError(_("The file must be a CSV."))

        request = self.context.get("request")
        interventions = get_interventions(request.user.iaso_profile.account)
        df = pd.read_csv(value)

        self.context["assignment_df"] = df
        self.context["interventions"] = interventions

        # Raise this before the rest as this is a blocking issue
        if "org_unit_id" not in df.columns:
            raise serializers.ValidationError(_("The CSV must contain an 'org_unit_id' column."))

        # We are more interested in missing headers for intervention names than fixed ones
        header_errors = get_missing_headers(df, interventions)

        csv_org_unit_ids = set(df["org_unit_id"].dropna().astype(int).unique().tolist())
        org_units = get_valid_org_units_with_geography(request.user.iaso_profile.account)
        available_org_unit_ids = set(org_units.values_list("id", flat=True))
        not_found_org_units = csv_org_unit_ids - available_org_unit_ids
        missing_org_units_from_file = available_org_unit_ids - csv_org_unit_ids

        if header_errors or not_found_org_units or missing_org_units_from_file:
            errors = {
                "header_errors": header_errors,
                "not_found_org_units": list(not_found_org_units),
                "missing_org_units_from_file": list(missing_org_units_from_file),
            }
            raise serializers.ValidationError(errors)

        return value
