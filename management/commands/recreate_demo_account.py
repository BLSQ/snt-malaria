import os

from django.contrib.auth.models import Permission, User
from django.core.management.base import BaseCommand
from django.db import transaction

from iaso.gpkg.import_gpkg import import_gpkg_file2
from iaso.models import Account, DataSource, MetricType, MetricValue, Profile, Project, Report, SourceVersion, Team
from iaso.models.data_store import JsonDataStore
from iaso.permissions.core_permissions import CORE_DATASTORE_READ_PERMISSION
from plugins.snt_malaria.models import (
    Budget,
    Intervention,
    InterventionAssignment,
    InterventionCategory,
    InterventionCostBreakdownLine,
    Scenario,
)
from plugins.snt_malaria.permissions import (
    SNT_SCENARIO_BASIC_WRITE_PERMISSION,
    SNT_SCENARIO_FULL_WRITE_PERMISSION,
    SNT_SETTINGS_READ_PERMISSION,
    SNT_SETTINGS_WRITE_PERMISSION,
)

from .support.demo_scenario_seeder import DemoScenarioSeeder
from .support.intervention_seeder import InterventionSeeder
from .support.metrics_importer import MetricsImporter


DEMO_ACCOUNT_NAME = "Burkina Faso (demo)"
DEMO_USER_USERNAME = "demo"
DEMO_USER_PASSWORD = "demo"


class Command(BaseCommand):
    help = "Set up the 'Burkina Faso Demo' account. If the account already exists, it will be deleted and re-created."

    def delete_existing_demo_account(self):
        """Delete the demo account and all associated resources."""
        if not Account.objects.filter(name=DEMO_ACCOUNT_NAME).exists():
            return

        demo_account = Account.objects.get(name=DEMO_ACCOUNT_NAME)
        projects = Project.objects.filter(account=demo_account)
        data_sources = DataSource.objects.filter(projects__in=projects)
        JsonDataStore.objects.filter(account=demo_account).delete()
        scenarios = Scenario.objects_include_deleted.filter(account=demo_account)
        categories = InterventionCategory.objects_include_deleted.filter(account=demo_account)
        interventions = Intervention.objects_include_deleted.filter(intervention_category__in=categories)
        metric_types = MetricType.objects.filter(account=demo_account)

        # Delete in order to avoid PROTECT foreign key constraints
        InterventionAssignment.objects.filter(scenario__in=scenarios).delete()
        budgets = Budget.objects_include_deleted.filter(scenario__in=scenarios)
        for b in budgets:
            b.delete_hard()
        for s in scenarios:
            s.delete_hard()
        InterventionCostBreakdownLine.objects.filter(intervention__in=interventions).delete()
        for i in interventions:
            i.delete_hard()
        for c in categories:
            c.delete_hard()
        MetricValue.objects.filter(metric_type__in=metric_types).delete()
        metric_types.delete()
        Team.objects.filter(project__in=projects).delete()
        Report.objects.filter(project__in=projects).delete()
        data_sources.delete()
        projects.delete()
        User.objects.filter(username=DEMO_USER_USERNAME).delete()
        demo_account.delete()

        self.stdout.write(self.style.SUCCESS(f"Deleted existing demo account: {DEMO_ACCOUNT_NAME}"))

    def handle(self, *args, **options):
        self.delete_existing_demo_account()

        with transaction.atomic():
            # Demo user
            demo_user = User(
                username="demo",
                email="demo@bluesquarehub.com",
                first_name="Demo",
                last_name="User",
                is_staff=False,
                is_superuser=False,
            )
            demo_user.set_password("demo")
            demo_user.save()

            snt_permission_codenames = [
                permission.codename
                for permission in [
                    CORE_DATASTORE_READ_PERMISSION,
                    SNT_SCENARIO_BASIC_WRITE_PERMISSION,
                    SNT_SCENARIO_FULL_WRITE_PERMISSION,
                    SNT_SETTINGS_READ_PERMISSION,
                    SNT_SETTINGS_WRITE_PERMISSION,
                ]
            ]
            snt_permissions = Permission.objects.filter(codename__in=snt_permission_codenames)
            demo_user.user_permissions.set(snt_permissions)

            self.stdout.write(f"Created new admin user: {DEMO_USER_USERNAME} / {DEMO_USER_PASSWORD}")

            # Demo account
            account = Account.objects.create(name=DEMO_ACCOUNT_NAME)
            self.stdout.write(f"Created Account: {account.name}")

            profile = Profile.objects.create(user=demo_user, account=account)
            project = Project.objects.create(name="Burkina Faso Project", account=account, app_id="burkina")
            profile.projects.add(project)

            # Create DataSource for Burkina Faso
            data_source = DataSource.objects.create(name="Burkina Faso Public Data", description="")
            data_source.projects.add(project)

            source_version = SourceVersion.objects.create(data_source=data_source, number=1, description="v1")
            account.default_version = source_version
            account.save()

            data_source.default_version = source_version
            data_source.save()

            self.stdout.write("Created Profile, Project, DataSource, SourceVersion.")

            # Import .gpkg file into the SourceVersion
            gpkg_file_path = os.path.join(os.path.dirname(__file__), "fixtures", "Burkina-Faso-org-units.gpkg")
            self.stdout.write(f"Importing GPKG file: {gpkg_file_path}.")
            try:
                total_imported = import_gpkg_file2(
                    filename=gpkg_file_path,
                    source=data_source,
                    version_number=source_version.number,
                    validation_status="VALID",
                    user=demo_user,
                    description="Burkina Faso OUs imported from GPKG",
                    task=None,
                )
                self.stdout.write(f"Imported {total_imported} org units from GPKG")
                # Make sure validation_status is set to "VALID"
                source_version.orgunit_set.update(validation_status="VALID")
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Failed to import GPKG file: {e}"))
                raise

            # Import data layers (metrics)
            metadata_file_path = os.path.join(os.path.dirname(__file__), "fixtures", "BFA_dummy_metadata.csv")
            dataset_file_path = os.path.join(os.path.dirname(__file__), "fixtures", "BFA_dummy_results_dataset.csv")

            self.stdout.write(f"Importing metrics data from {metadata_file_path} and {dataset_file_path}")
            try:
                metrics_importer = MetricsImporter(account, self.style, self.stdout.write)
                total_values = metrics_importer.import_metrics(metadata_file_path, dataset_file_path)
                self.stdout.write(f"Successfully imported {total_values} metric values")
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Failed to import metrics data: {e}"))
                raise

            # Seed interventions and intervention costs
            InterventionSeeder(account, self.stdout.write).create_interventions()

            # Create demo scenario with intervention assignments
            DemoScenarioSeeder(account, project, self.stdout.write).create_scenario()

            self.stdout.write(self.style.SUCCESS("Setup completed successfully:"))
            self.stdout.write(
                f"\n  - Account: {account.name} (ID: {account.id})"
                f"\n  - Project: {project.name} (ID: {project.id})"
                f"\n  - DataSource: {data_source.name} (ID: {data_source.id})"
                f"\n  - SourceVersion: {source_version.number} (ID: {source_version.id})"
                f"\n  - Profile: {demo_user.username} -> {account.name}"
            )
            self.stdout.write(self.style.SUCCESS("\nDemo user created with credentials:"))
            self.stdout.write(self.style.SUCCESS(f"\tUsername: {DEMO_USER_USERNAME}"))
            self.stdout.write(self.style.SUCCESS(f"\tPassword: {DEMO_USER_PASSWORD}"))
