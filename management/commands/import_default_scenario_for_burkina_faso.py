import csv
import logging
import os

from django.core.management.base import BaseCommand

from iaso.models import User, Workspace
from iaso.models.org_unit import OrgUnit
from plugins.snt_malaria.models import InterventionAssignment
from plugins.snt_malaria.models.intervention import Intervention
from plugins.snt_malaria.models.scenario import Scenario


logger = logging.getLogger(__name__)

DEFAULT_SCENARIO_NAME = "WHO scenario"
# To use this script in it's current form, you need to add this file to the correct folder
BFA_INTERVENTION_MIX = os.path.join(os.path.dirname(__file__), "burkina_faso/BFA_intervention_mix.csv")


class Command(BaseCommand):
    help = "Script to import “WHO scenario” as default scenario for Burkina Faso"

    def add_arguments(self, parser):
        parser.add_argument("--workspace-id", type=int, required=True, help="Workspace receiving the scenario")

    def handle(self, *args, **options):
        workspace = Workspace.objects.select_related("account").get(pk=options["workspace_id"])
        account = workspace.account
        logger.info(f"Workspace: {workspace.name} (account {account.name})")
        logger.info("---------------------------------------------------------")
        logger.info("1. Get or create the default scenario")
        created_by = User.objects.filter(iaso_profile__account=account).first()
        default_scenario, created = Scenario.objects.get_or_create(
            name__iexact=DEFAULT_SCENARIO_NAME,  # This should be adjusted (see below)
            workspace=workspace,
            defaults={
                "name": DEFAULT_SCENARIO_NAME,
                "created_by": created_by,
            },
        )
        if not created:
            logger.info("2. Remove interventions mix related to default scenario if it exists")
            InterventionAssignment.objects.filter(scenario=default_scenario).delete()

        logger.info("3. Creating default scenario's interventions mix")
        logger.info("---------------------------------------------------------")
        intervention_count = 1
        with open(BFA_INTERVENTION_MIX, newline="", encoding="utf-8") as csvfile:
            csvreader = csv.DictReader(csvfile)
            assignments = []
            for row in csvreader:
                org_unit = OrgUnit.objects.get(source_ref=row["ADM2_ID"])
                if org_unit:
                    csv_intervention_mix = row["INTERVENTION_MIX"].split(", ")
                    db_interventions_mixs = Intervention.objects.filter(
                        name__iregex=r"(" + "|".join(csv_intervention_mix) + ")",
                        intervention_category__workspace=workspace,
                    )

                    if len(csv_intervention_mix) != len(db_interventions_mixs):
                        raise ValueError("ERROR: Unknown intervention type", csv_intervention_mix)

                    for intervention in db_interventions_mixs:
                        assignments.append(
                            InterventionAssignment(
                                scenario=default_scenario,
                                org_unit=org_unit,
                                intervention=intervention,
                                created_by=created_by,
                            )
                        )
                        logger.info(
                            f"{intervention_count}. The intervention '{intervention.name}' is added to '{default_scenario.name}' scenario on '{org_unit.name}' Org unit"
                        )
                        intervention_count += 1

            InterventionAssignment.objects.bulk_create(assignments)
        logger.info("---------------------------------------------------------")
        logger.info("Successfully done")
