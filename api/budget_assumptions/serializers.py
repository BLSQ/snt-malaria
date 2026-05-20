from django.db import transaction
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied
from snt_malaria_budgeting import DEFAULT_COST_ASSUMPTIONS

from plugins.snt_malaria.models.budget_assumptions import BudgetAssumptions
from plugins.snt_malaria.models.intervention import InterventionAssignment
from plugins.snt_malaria.models.scenario import Scenario
from plugins.snt_malaria.permissions import SNT_SCENARIO_FULL_WRITE_PERMISSION


class BudgetAssumptionsQuerySerializer(serializers.Serializer):
    scenario = serializers.PrimaryKeyRelatedField(queryset=Scenario.objects.none())
    year = serializers.IntegerField(required=False, allow_null=True)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        user = self.context["request"].user
        account = user.iaso_profile.account
        self.fields["scenario"].queryset = Scenario.objects.filter(account=account)


class BudgetAssumptionsReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = BudgetAssumptions
        fields = ("id", "scenario", "intervention_assignment", "year", "coverage")


class DefaultCostAssumptionsSerializer(serializers.Serializer):
    def to_representation(self, instance):
        return {
            key.replace("_coverage", ""): {"coverage": value}
            for key, value in DEFAULT_COST_ASSUMPTIONS.items()
            if key.endswith("_coverage")
        }


class BudgetAssumptionsUpdateSerializer(serializers.ModelSerializer):
    coverage = serializers.DecimalField(min_value=0, max_value=1, max_digits=3, decimal_places=2)
    year = serializers.IntegerField(required=False, allow_null=True)

    class Meta:
        model = BudgetAssumptions
        fields = ["coverage", "year"]


class BudgetAssumptionsUpsertManySerializer(serializers.Serializer):
    scenario = serializers.PrimaryKeyRelatedField(queryset=Scenario.objects.none())

    intervention_assignments = serializers.ListField(child=serializers.IntegerField(min_value=1), allow_empty=False)
    budget_assumptions = BudgetAssumptionsUpdateSerializer(many=True)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        user = self.context["request"].user
        account = user.iaso_profile.account
        self.fields["scenario"].queryset = Scenario.objects.filter(account=account)

    def validate_scenario(self, value):
        user = self.context["request"].user
        if value.created_by != user and not user.has_perm(SNT_SCENARIO_FULL_WRITE_PERMISSION.full_name()):
            raise PermissionDenied("User does not have permission to modify assumptions for this scenario")
        return value

    def validate(self, attrs):
        scenario = attrs.get("scenario")
        assignment_ids = attrs.get("intervention_assignments") or []

        # Deduplicate while keeping input order stable.
        unique_assignment_ids = list(dict.fromkeys(assignment_ids))
        assignments = list(
            InterventionAssignment.objects.filter(
                id__in=unique_assignment_ids,
                scenario=scenario,
            )
        )

        assignments_by_id = {assignment.id: assignment for assignment in assignments}
        found_ids = set(assignments_by_id.keys())
        requested_ids = set(unique_assignment_ids)
        missing_ids = requested_ids - found_ids

        if missing_ids:
            raise serializers.ValidationError(
                {"intervention_assignments": f"Invalid intervention assignment IDs: {missing_ids}"}
            )

        resolved_assignments = [assignments_by_id[assignment_id] for assignment_id in unique_assignment_ids]

        attrs["intervention_assignments"] = resolved_assignments

        return attrs

    def save(self, **kwargs):
        scenario = self.validated_data["scenario"]
        assignments = self.validated_data["intervention_assignments"]
        budget_assumptions_data = self.validated_data["budget_assumptions"]
        result = []
        with transaction.atomic():
            BudgetAssumptions.objects.filter(
                scenario=scenario,
                intervention_assignment__in=assignments,
                year__in=[a.get("year") for a in budget_assumptions_data],
            ).delete()
            bulk_create_data = []
            for assumption_data in budget_assumptions_data:
                for assignment in assignments:
                    bulk_create_data.append(
                        BudgetAssumptions(
                            scenario=scenario,
                            intervention_assignment=assignment,
                            year=assumption_data.get("year"),
                            coverage=assumption_data["coverage"],
                        )
                    )

            result = BudgetAssumptions.objects.bulk_create(bulk_create_data)

        return result
