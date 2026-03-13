import pandas as pd

from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from iaso.api.common import UserSerializer
from iaso.utils.org_units import get_valid_org_units_with_geography
from plugins.snt_malaria.api.scenarios.utils import (
    get_interventions,
    get_missing_headers,
)
from plugins.snt_malaria.models import Scenario, ScenarioRule


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


class ScenarioWriteSerializer(serializers.ModelSerializer):
    name = serializers.CharField(required=True)
    description = serializers.CharField(required=False, allow_blank=True)
    start_year = serializers.IntegerField(required=True)
    end_year = serializers.IntegerField(required=True)

    SCENARIO_MIN_YEAR = 2024
    SCENARIO_MAX_YEAR = 2035

    class Meta:
        model = Scenario
        fields = ["id", "name", "description", "start_year", "end_year", "is_locked"]
        read_ony_fields = ["id"]

    def validate_start_year(self, value):
        if value < ScenarioWriteSerializer.SCENARIO_MIN_YEAR or value > ScenarioWriteSerializer.SCENARIO_MAX_YEAR:
            raise serializers.ValidationError(_("Start year must be between 2024 and 2035."))

        if self.initial_data.get("end_year") and value > int(self.initial_data["end_year"]):
            raise serializers.ValidationError(_("Start year should be lower or equal end year."))

        return value

    def validate_name(self, value):
        # If we update, we don't want to check for duplicates as long as the name is not changed
        if self.instance is not None and self.instance.name == value:
            return value

        request = self.context.get("request")
        account = request.user.iaso_profile.account

        if Scenario.objects.filter(name=value, account=account).exists():
            raise serializers.ValidationError(_("A scenario with this name already exists for your account."))

        return value


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


class ScenarioRulesReorderSerializer(serializers.Serializer):
    new_order = serializers.PrimaryKeyRelatedField(many=True, queryset=ScenarioRule.objects.none(), required=True)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        scenario = self.context["scenario"]
        self.fields["new_order"].child_relation.queryset = ScenarioRule.objects.filter(scenario=scenario)

    def validate_new_order(self, new_order):
        scenario = self.context["scenario"]
        received_ids = set(rule.id for rule in new_order)
        scenario_rules_ids = set(scenario.rules.order_by("id").values_list("id", flat=True))

        missing_rules = scenario_rules_ids - received_ids
        if missing_rules:
            raise serializers.ValidationError(f"Missing rule IDs that belong to the scenario - {missing_rules}")

        return new_order
