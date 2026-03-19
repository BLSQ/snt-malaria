import csv

from datetime import datetime

from django.db import IntegrityError, transaction
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from drf_yasg.utils import swagger_auto_schema
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from iaso.api.common import CONTENT_TYPE_CSV
from iaso.utils.org_units import get_valid_org_units_with_geography
from plugins.snt_malaria.api.scenarios.utils import (
    duplicate_rules,
    get_assignments_from_row,
    get_csv_headers,
    get_csv_row,
    get_scenario,
)
from plugins.snt_malaria.models import InterventionAssignment, Scenario, ScenarioRule
from plugins.snt_malaria.models.intervention import Intervention

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

    def perform_update(self, serializer):
        try:
            serializer.save()
        except IntegrityError as e:
            if "duplicate" in str(e).lower() and "(account_id, name)" in str(e).lower():
                raise serializers.ValidationError(_("Scenario with this name already exists."))
            if "snt_malaria_scenario_start_year_lte_end_year" in str(e).lower():
                raise serializers.ValidationError(_("Start year should be lower or equal end year."))
            raise serializers.ValidationError(str(e))

    # Custom action to duplicate a scenario
    @transaction.atomic
    @swagger_auto_schema(request_body=ScenarioWriteSerializer(many=False))
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

        new_scenario.refresh_assignments(request.user)

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

        org_units = get_valid_org_units_with_geography(self.request.user.iaso_profile.account).order_by("name")

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

        # Get scenario property from serializer
        scenario = get_scenario(request.user, base_name="Imported Scenario")
        with transaction.atomic():
            scenario.save()
            intervention_assignments = []

            for _, row in assignment_df.iterrows():
                assignments = get_assignments_from_row(request.user, scenario, row, interventions)
                if assignments:
                    intervention_assignments.extend(assignments)

            if intervention_assignments:
                InterventionAssignment.objects.bulk_create(intervention_assignments)
            else:
                raise ValidationError("No assignments to create from the provided CSV data.")

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
