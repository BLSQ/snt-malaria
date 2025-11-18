import csv

from datetime import datetime

from django.db import IntegrityError, transaction
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils.translation import gettext_lazy as _
from drf_yasg.utils import swagger_auto_schema
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from iaso.api.common import CONTENT_TYPE_CSV
from plugins.snt_malaria.api.scenarios.utils import (
    get_assignments_from_row,
    get_csv_headers,
    get_csv_row,
    get_org_units,
    get_scenario,
)
from plugins.snt_malaria.models import InterventionAssignment, Scenario
from plugins.snt_malaria.models.intervention import Intervention

from .serializers import DuplicateScenarioSerializer, ImportScenarioSerializer, ScenarioSerializer


class ScenarioViewSet(viewsets.ModelViewSet):
    """Scenario API

    POST /api/scenarios/duplicate
    Duplicate scenario for specified id
    {
        "id_to_duplicate": Int
    }
    """

    serializer_class = ScenarioSerializer
    ordering_fields = ["id", "name"]
    http_method_names = ["get", "post", "put", "delete"]

    def get_queryset(self):
        return Scenario.objects.filter(account=self.request.user.iaso_profile.account)

    def perform_create(self, serializer):
        serializer.validated_data["created_by"] = self.request.user
        serializer.validated_data["account"] = self.request.user.iaso_profile.account
        serializer.save()

    def perform_update(self, serializer):
        serializer.validated_data["updated_by"] = self.request.user
        try:
            serializer.save()
        except IntegrityError as e:
            if "duplicate" in str(e).lower() and "(account_id, name)" in str(e).lower():
                raise serializers.ValidationError(_("Scenario with this name already exists."))
            if "snt_malaria_scenario_end_year_gte_start_year" in str(e).lower():
                raise serializers.ValidationError(_("Start year should be lower or equal end year."))
            raise serializers.ValidationError(str(e))

    # Custom action to duplicate a scenario
    @swagger_auto_schema(request_body=DuplicateScenarioSerializer(many=False))
    @action(detail=False, methods=["post"], url_path="duplicate")
    def duplicate(self, request):
        serializer = DuplicateScenarioSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        # Duplicate the scenario
        id_to_duplicate = serializer.validated_data.get("id_to_duplicate")
        scenario = get_object_or_404(Scenario, pk=id_to_duplicate)
        scenario.pk = None

        scenario.name = f"Copy of {scenario.name}"

        duplicate = Scenario.objects.filter(name=scenario.name)
        if duplicate.exists():
            # If a scenario with the same name already exists, append a timestamp to the name
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")
            scenario.name = f"{scenario.name} - {timestamp}"

        try:
            scenario.save()
        except Exception as e:
            raise ValidationError(f"Error saving scenario: {e}")

        # Duplicate related intevention assignments
        assignments = InterventionAssignment.objects.filter(scenario_id=id_to_duplicate)
        for assignment in assignments:
            assignment.pk = None
            assignment.scenario = scenario
            assignment.save()
        serializer = self.get_serializer(scenario)
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

        org_units = get_org_units(self.request.user)

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
        scenario = get_scenario(request.user, baseName="Imported Scenario")
        with transaction.atomic():
            scenario.save()
            intervention_assignments = []

            for index, row in assignment_df.iterrows():
                assignment = get_assignments_from_row(request.user, scenario, row, interventions)
                if assignment is not None and len(assignment) > 0:
                    intervention_assignments.extend(assignment)

            if intervention_assignments and len(intervention_assignments) > 0:
                InterventionAssignment.objects.bulk_create(intervention_assignments)
            else:
                raise ValidationError("No assignments to create from the provided CSV data.")

        return Response({"status": "Import successful", "id": scenario.id}, status=status.HTTP_201_CREATED)
