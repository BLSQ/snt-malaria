import os
import uuid

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.db import transaction

from iaso.gpkg.import_gpkg import import_gpkg_file2
from iaso.models import Account, DataSource, Profile, Project, SourceVersion

from .support.intervention_seeder import InterventionSeeder
from .support.metrics_importer import MetricsImporter


class Command(BaseCommand):
    help = "Set up a new dummy Account with name 'Burkina Faso' and connect admin user to it"

    def handle(self, *args, **options):
        # Create a hash to ensure creation of unique objects
        hash = uuid.uuid4().hex[:6]

        with transaction.atomic():
            # If "admin" already exists, create a unique one
            admin_username = "admin"
            if User.objects.filter(username=admin_username).exists():
                admin_username = f"admin-{hash}"

            admin_user = User(
                username=admin_username,
                email=f"{admin_username}@bluesquarehub.com",
                first_name="Admin",
                last_name="User",
                is_staff=True,
                is_superuser=True,
            )
            admin_user.set_password("admin")
            admin_user.save()
            self.stdout.write(self.style.SUCCESS(f"Created new admin user: {admin_username} with password 'admin'"))

            # If "Burkina Faso" already exists, create a unique one
            account_name = "Burkina Faso"
            if Account.objects.filter(name=account_name).exists():
                account_name = f"Burkina Faso-{hash}"

            account = Account.objects.create(name=account_name)
            self.stdout.write(self.style.SUCCESS(f"Created Account: {account.name}"))

            # Check if profile already exists for this user and account
            profile = Profile.objects.create(user=admin_user, account=account)
            self.stdout.write(
                self.style.SUCCESS(
                    f"Created Profile connecting user '{admin_user.username}' to account '{account.name}'"
                )
            )

            # Create Project
            project = Project.objects.create(name="Burkina Faso Project", account=account, app_id=uuid.uuid4())
            profile.projects.add(project)
            self.stdout.write(self.style.SUCCESS(f"Created Project: {project.name}"))

            # Create DataSource for Burkina Faso
            data_source_name = "Burkina Faso Data Source (dummy)"
            if DataSource.objects.filter(name=data_source_name).exists():
                data_source_name = f"{data_source_name}-{hash}"
            data_source = DataSource.objects.create(
                name=data_source_name, description="Dummy data source for BFA org units"
            )
            self.stdout.write(self.style.SUCCESS(f"Created DataSource: {data_source.name}"))

            # Link project to data source
            data_source.projects.add(project)

            # Create initial SourceVersion
            source_version = SourceVersion.objects.create(
                data_source=data_source, number=1, description="Initial version for Burkina Faso data"
            )
            self.stdout.write(
                self.style.SUCCESS(f"Created SourceVersion: {source_version.number} for {data_source.name}")
            )

            # Set default version for account and data source
            account.default_version = source_version
            account.save()
            self.stdout.write(self.style.SUCCESS(f"Set default version for account '{account.name}'"))

            data_source.default_version = source_version
            data_source.save()
            self.stdout.write(self.style.SUCCESS(f"Set default version for data source '{data_source.name}'"))

            # Import .gpkg file into the SourceVersion (only if no org units exist for this data source)
            existing_org_units = source_version.orgunit_set.count()

            if existing_org_units > 0:
                self.stdout.write(
                    self.style.WARNING(f"Data source already has {existing_org_units} org units, skipping GPKG import")
                )
            else:
                gpkg_file_path = os.path.join(os.path.dirname(__file__), "fixtures", "Burkina-Faso-org-units.gpkg")
                self.stdout.write(f"Importing GPKG file: {gpkg_file_path}. This can take a minute.")
                try:
                    total_imported = import_gpkg_file2(
                        filename=gpkg_file_path,
                        project=project,
                        source=data_source,
                        version_number=source_version.number,
                        validation_status="VALID",
                        user=admin_user,
                        description="Burkina Faso organizational units imported from GPKG",
                        task=None,
                    )
                    self.stdout.write(
                        self.style.SUCCESS(f"Successfully imported {total_imported} organizational units from GPKG")
                    )
                    # Make sure validation_status is set to "VALID"
                    source_version.orgunit_set.update(validation_status="VALID")
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Failed to import GPKG file: {e}"))
                    raise

            # Import metrics data
            metadata_file_path = os.path.join(os.path.dirname(__file__), "fixtures", "BFA_dummy_metadata.csv")
            dataset_file_path = os.path.join(os.path.dirname(__file__), "fixtures", "BFA_dummy_results_dataset.csv")

            self.stdout.write(f"Importing metrics data from {metadata_file_path} and {dataset_file_path}")
            try:
                metrics_importer = MetricsImporter(account, self.stdout.write)
                total_values = metrics_importer.import_metrics(metadata_file_path, dataset_file_path)
                self.stdout.write(self.style.SUCCESS(f"Successfully imported {total_values} metric values"))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Failed to import metrics data: {e}"))
                raise

            # Seed interventions
            InterventionSeeder(account, self.stdout.write).create_interventions()

            self.stdout.write(self.style.SUCCESS("Setup completed successfully!"))
            self.stdout.write(
                f"\n  - Account: {account.name} (ID: {account.id})"
                f"\n  - Project: {project.name} (ID: {project.id})"
                f"\n  - DataSource: {data_source.name} (ID: {data_source.id})"
                f"\n  - SourceVersion: {source_version.number} (ID: {source_version.id})"
                f"\n  - Profile: {admin_user.username} -> {account.name}"
            )
            self.stdout.write(self.style.SUCCESS("\nYou can now log in with the following credentials:"))
            self.stdout.write(self.style.SUCCESS(f"  Username: {admin_user.username}"))
            self.stdout.write(self.style.SUCCESS("  Password: admin"))
