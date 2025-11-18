from datetime import datetime

from django.db.models import Q

from iaso.models.org_unit import OrgUnit
from plugins.snt_malaria.models.intervention import Intervention, InterventionAssignment
from plugins.snt_malaria.models.scenario import Scenario


def get_scenario(user, baseName="Scenario"):
    return Scenario(
        name=f"{baseName} {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        created_by=user,
        account=user.iaso_profile.account,
        start_year=datetime.now().year,
        end_year=datetime.now().year + 3,
    )


def get_interventions(account):
    return Intervention.objects.filter(intervention_category__account=account).values("id", "name")


def get_org_units(user):
    return (
        OrgUnit.objects.order_by("name")
        .filter_for_user(user)
        .filter(validation_status=OrgUnit.VALIDATION_VALID)
        .filter(Q(location__isnull=False) | Q(simplified_geom__isnull=False))
    )


def get_csv_headers(interventions):
    csv_header_columns = ["org_unit_id", "org_unit_name"]
    intervention_names = interventions.values_list("name", flat=True).order_by("name")
    csv_header_columns.extend(intervention_names)
    return csv_header_columns


def get_csv_row(org_unit_id, org_unit_name, org_unit_interventions, interventions):
    row = [org_unit_id, org_unit_name]
    for intervention in interventions:
        if any(assignment.intervention.id == intervention.id for assignment in org_unit_interventions):
            row.append(1)
        else:
            row.append(0)

    return row


def get_assignments_from_row(user, scenario, row, interventions):
    assignments = []
    for intervention in interventions:
        intervention_name = intervention["name"]
        assigned_value = row[intervention_name]
        if assigned_value == 1:
            assignment = InterventionAssignment(
                scenario=scenario,
                org_unit_id=row["org_unit_id"],
                intervention_id=intervention["id"],
                created_by=user,
            )
            assignments.append(assignment)
    return assignments
