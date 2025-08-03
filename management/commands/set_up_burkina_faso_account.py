import os
from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.db import transaction

from iaso.models import Account, DataSource, Profile, Project, SourceVersion
from iaso.gpkg.import_gpkg import import_gpkg_file2


class Command(BaseCommand):
    help = "Set up a new dummy Account with name 'Burkina Faso' and connect admin user to it"

    def handle(self, *args, **options):
        with transaction.atomic():
            # Check if admin user exists
            try:
                admin_user = User.objects.get(username="admin")
            except User.DoesNotExist:
                self.stdout.write(self.style.ERROR("Admin user does not exist. Please create an admin user first."))
                return

            # Check if Burkina Faso account already exists
            account, created = Account.objects.get_or_create(name="Burkina Faso")

            if created:
                self.stdout.write(self.style.SUCCESS(f"Created Account: {account.name}"))
            else:
                self.stdout.write(self.style.WARNING(f"Account '{account.name}' already exists"))

            # Check if profile already exists for this user and account
            profile, profile_created = Profile.objects.get_or_create(user=admin_user, account=account)

            if profile_created:
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Created Profile connecting user '{admin_user.username}' to account '{account.name}'"
                    )
                )
            else:
                self.stdout.write(
                    self.style.WARNING(
                        f"Profile for user '{admin_user.username}' and account '{account.name}' already exists"
                    )
                )

            self.stdout.write(self.style.SUCCESS("Done."))

            # Create Project
            project, project_created = Project.objects.get_or_create(
                name="Burkina Faso Project", account=account, defaults={"app_id": "burkina"}
            )

            if project_created:
                self.stdout.write(self.style.SUCCESS(f"Created Project: {project.name}"))
            else:
                self.stdout.write(self.style.WARNING(f"Project '{project.name}' already exists"))

            # Add project to profile
            if not profile.projects.filter(id=project.id).exists():
                profile.projects.add(project)
                self.stdout.write(self.style.SUCCESS(f"Added project '{project.name}' to profile"))

            # Create DataSource for Burkina Faso
            data_source, ds_created = DataSource.objects.get_or_create(
                name="Burkina Faso Data Source",
                defaults={"description": "Dummy data source for BFA org units"},
            )

            if ds_created:
                self.stdout.write(self.style.SUCCESS(f"Created DataSource: {data_source.name}"))
            else:
                self.stdout.write(self.style.WARNING(f"DataSource '{data_source.name}' already exists"))

            # Link project to data source
            if not data_source.projects.filter(id=project.id).exists():
                data_source.projects.add(project)
                self.stdout.write(
                    self.style.SUCCESS(f"Linked project '{project.name}' to data source '{data_source.name}'")
                )

            # Create initial SourceVersion
            source_version, sv_created = SourceVersion.objects.get_or_create(
                data_source=data_source, number=1, defaults={"description": "Initial version for Burkina Faso data"}
            )

            if sv_created:
                self.stdout.write(
                    self.style.SUCCESS(f"Created SourceVersion: {source_version.number} for {data_source.name}")
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f"SourceVersion {source_version.number} for '{data_source.name}' already exists")
                )

            # Set default version for account and data source
            if not account.default_version:
                account.default_version = source_version
                account.save()
                self.stdout.write(self.style.SUCCESS(f"Set default version for account '{account.name}'"))

            if not data_source.default_version:
                data_source.default_version = source_version
                data_source.save()
                self.stdout.write(self.style.SUCCESS(f"Set default version for data source '{data_source.name}'"))

            # Import .gpkg file into the SourceVersion
            gpkg_file_path = os.path.join(os.path.dirname(__file__), "fixtures", "Burkina-Faso-org-units.gpkg")

            if os.path.exists(gpkg_file_path):
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
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Failed to import GPKG file: {e}"))
                    raise
            else:
                self.stdout.write(self.style.WARNING(f"GPKG file not found at: {gpkg_file_path}"))

            self.stdout.write(self.style.SUCCESS("Setup completed successfully!"))
            self.stdout.write(
                f"\n  - Account: {account.name} (ID: {account.id})"
                f"\n  - Project: {project.name} (ID: {project.id})"
                f"\n  - DataSource: {data_source.name} (ID: {data_source.id})"
                f"\n  - SourceVersion: {source_version.number} (ID: {source_version.id})"
                f"\n  - Profile: {admin_user.username} -> {account.name}"
            )
