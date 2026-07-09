import csv

from datetime import datetime

from django.db import IntegrityError, transaction
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from iaso.api.common import CONTENT_TYPE_CSV
from plugins.snt_malaria.api.scenarios.utils import (
    create_rules_from_import,
    duplicate_rules,
    duplicate_scenario_yearly_cost_assignment,
    get_csv_headers,
    get_csv_row,
    get_scenario,
)
from plugins.snt_malaria.models import InterventionAssignment, Scenario, ScenarioRule
from plugins.snt_malaria.models.account_settings import get_intervention_org_units
from plugins.snt_malaria.models.intervention import Intervention
from plugins.snt_malaria.services import BudgetCalculationService

from .permissions import ScenarioPermission
from .serializers import (
    ImportScenarioSerializer,
    ScenarioRulesReorderSerializer,
    ScenarioSerializer,
    ScenarioWriteSerializer,
)


class ScenarioViewSet(viewsets.ModelViewSet):
    """Scenario API

    POST /api/scenarios/duplicate
    Duplicate scenario for specified id
    {
        "scenario_to_duplicate": Int,
        "name": String,
        "description": String,
        "start_year": Int,
        "end_year": Int
    }
    """

    serializer_class = ScenarioSerializer
    ordering_fields = ["id", "name"]
    http_method_names = ["get", "post", "put", "patch", "delete"]
    permission_classes = [ScenarioPermission]

    def get_serializer_class(self):
        if self.request.method == "GET":
            return ScenarioSerializer
        return ScenarioWriteSerializer

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated or not hasattr(user, "iaso_profile"):
            return Scenario.objects.none()
        return (
            Scenario.objects.select_related("created_by")
            .prefetch_related("rules")
            .filter(account=user.iaso_profile.account)
        )

    def perform_create(self, serializer):
        serializer.validated_data["created_by"] = self.request.user
        serializer.validated_data["account"] = self.request.user.iaso_profile.account
        serializer.save()

    @transaction.atomic
    def perform_update(self, serializer):
        previous_reference_year = serializer.instance.reference_year

        try:
            scenario = serializer.save()
        except IntegrityError as e:
            if "duplicate" in str(e).lower() and "(account_id, name)" in str(e).lower():
                raise serializers.ValidationError(_("Scenario with this name already exists."))
            if "snt_malaria_scenario_start_year_lte_end_year" in str(e).lower():
                raise serializers.ValidationError(_("Start year should be lower or equal end year."))
            raise serializers.ValidationError(str(e))

        if scenario.reference_year != previous_reference_year:
            self._refresh_rules_for_reference_year_change(scenario)

    def _refresh_rules_for_reference_year_change(self, scenario):
        """Recompute org_units_matched for every rule of the scenario using the new reference_year,
        then refresh assignments and budget once for the whole scenario rather than per rule."""
        rules = list(scenario.rules.all())
        for rule in rules:
            rule.org_units_matched = ScenarioRule.resolve_matched_org_units(
                scenario.account, rule.matching_criteria, reference_year=scenario.reference_year
            )
        ScenarioRule.objects.bulk_update(rules, ["org_units_matched"])

        scenario.refresh_assignments(self.request.user)

        budget_service = BudgetCalculationService(scenario)
        budget_service.calculate_and_save_all_years(self.request.user)

    # Custom action to duplicate a scenario
    @transaction.atomic
    @extend_schema(request=ScenarioWriteSerializer(many=False))
    @action(detail=True, methods=["post"], url_path="duplicate")
    def duplicate(self, request, pk=None):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        initial_scenario = self.get_object()

        try:
            new_scenario = serializer.save(account=request.user.iaso_profile.account, created_by=request.user)
        except Exception as e:
            raise ValidationError(f"Error saving scenario: {e}")

        duplicate_rules(initial_scenario, new_scenario, request.user)
        duplicate_scenario_yearly_cost_assignment(initial_scenario, new_scenario, request.user)

        new_scenario.refresh_assignments(request.user)

        budget_service = BudgetCalculationService(new_scenario)
        budget_service.calculate_and_save_all_years(request.user)

        serializer = ScenarioSerializer(new_scenario)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    # Custom action to download scenario as CSV
    @action(detail=False, methods=["get"])
    def export_to_csv(self, request):
        scenario_id = request.query_params.get("id")
        scenario_name = "template"
        if scenario_id:
            scenario = get_object_or_404(self.get_queryset(), pk=scenario_id)
            scenario_name = scenario.name

        interventions = Intervention.objects.filter(
            intervention_category__account=self.request.user.iaso_profile.account
        )

        org_units = get_intervention_org_units(self.request.user.iaso_profile.account).order_by("name")

        assignments = (
            InterventionAssignment.objects.select_related("org_unit", "intervention").filter(scenario__id=scenario_id)
            if scenario_id
            else []
        )

        csv_header_columns = get_csv_headers(interventions)

        response = HttpResponse(content_type=CONTENT_TYPE_CSV)
        writer = csv.writer(response)
        writer.writerow(csv_header_columns)

        org_unit_interventions = {ou.id: {"name": ou.name, "assignments": []} for ou in org_units}
        for assignment in assignments:
            ou_id = assignment.org_unit.id
            if ou_id in org_unit_interventions:
                org_unit_interventions[ou_id]["assignments"].append(assignment)
            else:
                raise PermissionError(f"User doesn't have access to org unit {ou_id} of an assignment")

        for org_unit_id, oui in org_unit_interventions.items():
            row = get_csv_row(org_unit_id, oui["name"], oui["assignments"], interventions)
            writer.writerow(row)

        filename = "%s_%s.csv" % (scenario_name, datetime.now().strftime("%Y-%m-%d"))
        response["Content-Disposition"] = "attachment; filename=" + filename
        return response

    @action(detail=False, methods=["post"])
    def import_from_csv(self, request):
        serializer = ImportScenarioSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        assignment_df = serializer.context.get("assignment_df")
        interventions = serializer.context.get("interventions")
        account = request.user.iaso_profile.account
        all_org_unit_ids = set(ScenarioRule.resolve_matched_org_units(account, {"all": True}))

        scenario = get_scenario(request.user, base_name="Imported Scenario")
        with transaction.atomic():
            scenario.save()
            rules = create_rules_from_import(scenario, assignment_df, interventions, all_org_unit_ids, request.user)

            if not rules:
                raise ValidationError("No assignments to create from the provided CSV data.")

            scenario.refresh_assignments(request.user)

        return Response({"status": "Import successful", "id": scenario.id}, status=status.HTTP_201_CREATED)

    @action(methods=["PATCH"], detail=True)
    def reorder_rules(self, request, pk=None):
        scenario = self.get_object()
        context = self.get_serializer_context()
        context["scenario"] = scenario

        serializer = ScenarioRulesReorderSerializer(data=request.data, context=context)
        serializer.is_valid(raise_exception=True)

        user = request.user
        now = timezone.now()

        new_order = serializer.validated_data["new_order"]

        for index, rule in enumerate(new_order, start=1):
            rule.priority = index
            rule.updated_by = user
            rule.updated_at = now
        ScenarioRule.objects.bulk_update_with_deferred_constraint(new_order, ["priority", "updated_by", "updated_at"])

        # now that priorities have been updated,
        # we need to refresh the assignments of the scenario to reflect the new order of rules
        # only if transaction commit is successful
        scenario.refresh_assignments(user)

        return Response({}, status=status.HTTP_200_OK)
