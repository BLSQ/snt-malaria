from django.db import transaction
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from iaso.models.metric import MetricValue
from iaso.models.org_unit import OrgUnit
from iaso.utils.jsonlogic import jsonlogic_to_exists_q_clauses
from plugins.snt_malaria.models.intervention import InterventionAssignment
from plugins.snt_malaria.models.scenario_rule import ScenarioRule

from .serializers import WriteScenarioRuleSerializer


# TODO: Have a read serializer that will transform the matching_criteria json logic into a more readable format for the frontend
#       This will be used to display the matching criteria in the frontend in a more user-friendly way

# TODO: On save of a rule, we should also update the intervention assignments of the org units in scope of the rule
#       to make sure they are up to date with the rule's criteria.
#       It should take into account other rules that are in place for the same scenario.
#       Priority field should be used to determine which rule should be applied first in case of multiple rules matching the same org unit.


# Example APIView for creating ScenarioRule
class ScenarioRuleCreateView(APIView):
    def post(self, request):
        serializer = WriteScenarioRuleSerializer(data=request.data)
        if serializer.is_valid():
            jsonlogic = serializer.to_jsonlogic()
            scenario = serializer.validated_data.get("scenario")
            interventions = serializer.validated_data.get("interventions", [])
            q = jsonlogic_to_exists_q_clauses(jsonlogic, MetricValue.objects, "metric_type_id", "org_unit_id")
            org_unit_ids = MetricValue.objects.filter(q).values_list("org_unit_id", flat=True).distinct()

            # Save ScenarioRule instance
            rule = ScenarioRule.objects.create(
                scenario=scenario,
                priority=int(serializer.validated_data["priority"]),
                name=serializer.validated_data["name"],
                color=serializer.validated_data["color"],
                matching_criteria=jsonlogic,
                org_units_matched=list(org_unit_ids),  # TODO: Define if we need to store
                interventions=[i.id for i in interventions],
            )

            # Get all assignments that already exist for this scenario, org units and interventions to avoid duplicates
            existing_assignments = InterventionAssignment.objects.filter(
                scenario=scenario, org_unit_id__in=org_unit_ids, intervention__in=interventions
            ).values_list("org_unit_id", "intervention_id", "intervention__intervention_category_id")
            existing_assignments_set = set(existing_assignments)

            assignments = []
            for org_unit in org_unit_ids:
                for intervention in interventions:
                    if (
                        org_unit,
                        intervention.id,
                        intervention.intervention_category_id,
                    ) not in existing_assignments_set:
                        assignments.append(
                            InterventionAssignment(
                                scenario=scenario,
                                org_unit=org_unit,
                                intervention=intervention,
                                scenario_rule=rule,
                                created_by=request.user,
                            )
                        )
                    # TODO Hairy shit here

            return Response(
                {"matching_criteria": jsonlogic, "org_units": org_units_data}, status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
