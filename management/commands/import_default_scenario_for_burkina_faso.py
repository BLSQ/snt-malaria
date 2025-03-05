import csv
import os

from django.core.management.base import BaseCommand
from iaso.models.base import Account
from iaso.models.org_unit import OrgUnit
from plugins.snt_malaria.models import InterventionAssignment
from plugins.snt_malaria.models.intervention import Intervention
from plugins.snt_malaria.models.scenario import Scenario
from iaso.models import User

BURKINA_ACCOUNT_ID = 1
DEFAULT_SCENARIO_NAME = "WHO scenario"
BFA_INTERVENTION_MIX = os.path.join(
    os.path.dirname(__file__), "burkina_faso/BFA_intervention_mix.csv"
)


class Command(BaseCommand):
    help = "Script to import “WHO scenario” as default scenario for Burkina Faso"

    def handle(self, *args, **options):
        account = Account.objects.get(pk=BURKINA_ACCOUNT_ID)
        print(f"Account: {account.name}")
        print("---------------------------------------------------------")
        print("1. Get the default scenario")
        default_scenario = Scenario.objects.get(
            name__iexact=DEFAULT_SCENARIO_NAME, account=account
        )
        created_by = User.objects.filter(iaso_profile__account=account).first()
        if default_scenario:
            print(
                "2. Remove interventions mix related to default scenario if it exists"
            )
            InterventionAssignment.objects.filter(scenario=default_scenario).delete()
        else:
            print(
                "2. Create the new default scenario for Burkina faso if it doesn't exist"
            )
            default_scenario = Scenario.objects.create(
                name=DEFAULT_SCENARIO_NAME, account=account, created_by=created_by
            )

        print("3. Creating default scenario's interventions mix")
        print("---------------------------------------------------------")
        intervention_count = 1
        with open(BFA_INTERVENTION_MIX, newline="", encoding="utf-8") as csvfile:
            csvreader = csv.DictReader(csvfile)
            assignments = []
            for row in csvreader:
                org_unit = OrgUnit.objects.get(source_ref=row["ADM2_ID"])
                if org_unit:
                    csv_intervention_mix = row["INTERVENTION_MIX"].split(", ")
                    db_interventions_mixs = Intervention.objects.filter(
                        name__in=csv_intervention_mix
                    )
                    for intervention in db_interventions_mixs:
                        assignments.append(
                            InterventionAssignment(
                                scenario=default_scenario,
                                org_unit=org_unit,
                                intervention=intervention,
                                created_by=created_by,
                            )
                        )
                        print(
                            f"{intervention_count}. The intervention '{intervention.name}' is added to '{default_scenario.name}' scenario on '{org_unit.name}' Org unit"
                        )
                        intervention_count += 1

            InterventionAssignment.objects.bulk_create(assignments)
        print("---------------------------------------------------------")
        print("Successfully done")
