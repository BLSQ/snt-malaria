import os
import uuid

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.db import transaction

from iaso.gpkg.import_gpkg import import_gpkg_file2
from iaso.models import Account, DataSource, Profile, Project, SourceVersion, TenantUser
from plugins.snt_malaria.management.commands.support.intervention_seeder import InterventionSeeder


class Command(BaseCommand):
    help = "Set up a new Account, Project, DataSource, and import org units and metrics data"

    accounts_config = {
        "RDC": {
            "account_name": "Democratic Republic Of The Congo",
            "project_name": "DRC",
            "data_source_name": "RDC",
            "dataset_slug": "snt-results",
            "dataset_workspaceslug": "drc-snt-data-pre-processing",
        },
        "BFA": {
            "account_name": "Burkina Faso",
            "project_name": "BFA",
            "data_source_name": "BFA",
            "dataset_slug": "snt-results",
            "dataset_workspaceslug": "bfa-snt-process",
        },
    }

    def add_arguments(self, parser):
        parser.add_argument("--account_config_name", type=str, required=True, choices=self.accounts_config.keys())
        parser.add_argument("--main_username", type=str, default="admin")
        parser.add_argument("--gpkg_filename", type=str, required=True)

    def handle(self, *args, **options):
        account_config_name = options["account_config_name"]
        main_username = options["main_username"]
        gpkg_filename = options["gpkg_filename"]
        gpkg_path = os.path.join(os.path.dirname(__file__), "fixtures/setuper", gpkg_filename)

        account_config = self.accounts_config.get(account_config_name)
        if not account_config:
            self.stdout.write(
                self.style.ERROR(
                    f"Account config '{account_config_name}' not found. Available configs are: {list(self.accounts_config.keys())}"
                )
            )
            return

        account_name = account_config["account_name"]
        project_name = account_config["project_name"]
        data_source_name = account_config["data_source_name"]

        with transaction.atomic():
            # Get or create main user
            main_user, created = User.objects.get_or_create(
                username=main_username,
                defaults={
                    "email": f"{main_username}@bluesquarehub.com",
                    "first_name": "Admin",
                    "last_name": "User",
                    "is_staff": True,
                    "is_superuser": True,
                },
            )

            if created:
                password = uuid.uuid4().hex[:8]
                main_user.set_password(password)
                main_user.save()
                self.stdout.write(
                    self.style.SUCCESS(f"Created new main user: {main_username} with password '{password}'")
                )
            else:
                self.stdout.write(self.style.SUCCESS(f"Using existing user: {main_username}"))

            # Create Account
            account, created = Account.objects.get_or_create(name=account_name)
            if created:
                self.stdout.write(self.style.SUCCESS(f"Created Account: {account.name}"))
            else:
                self.stdout.write(self.style.SUCCESS(f"Using existing Account: {account.name}"))

            # Create account_user with name concatenated from main_user and account
            account_user = User.objects.create(
                username=f"{main_user.username}_account_{str(account.id)}",
                first_name=main_user.first_name,
                last_name=main_user.last_name,
                email=main_user.email,
                is_superuser=main_user.is_superuser,
                is_staff=main_user.is_staff,
            )

            # Link main user to account
            TenantUser.objects.create(main_user=main_user, account_user=account_user)
            profile, _ = Profile.objects.get_or_create(user=account_user, account=account)
            self.stdout.write(
                self.style.SUCCESS(f"Linked main user '{main_user.username}' to account '{account.name}'")
            )

            # Create Project
            project = Project.objects.create(name=project_name, account=account, app_id=uuid.uuid4())
            self.stdout.write(self.style.SUCCESS(f"Created Project: {project.name}"))

            # Create DataSource

            if DataSource.objects.filter(name=data_source_name).exists():
                hash = uuid.uuid4().hex[:6]
                data_source_name = f"{data_source_name}-{hash}"

            data_source = DataSource.objects.create(
                name=data_source_name, description=f"Data source for {account.name}"
            )
            self.stdout.write(self.style.SUCCESS(f"Created DataSource: {data_source.name}"))
            data_source.projects.add(project)

            # Create SourceVersion
            source_version = SourceVersion.objects.create(
                data_source=data_source, number=1, description=f"Initial version for {account.name} data"
            )
            self.stdout.write(
                self.style.SUCCESS(f"Created SourceVersion: {source_version.number} for {data_source.name}")
            )

            # Set default version for account and data source
            account.default_version = source_version
            account.save()
            data_source.default_version = source_version
            data_source.save()
            self.stdout.write(self.style.SUCCESS("Set default version for account and data source"))

            # Import org units from GPKG
            self.stdout.write(f"Importing org units from GPKG file: {gpkg_path}")
            try:
                total_imported = import_gpkg_file2(
                    filename=gpkg_path,
                    source=data_source,
                    version_number=source_version.number,
                    validation_status="VALID",
                    user=account_user,
                    description=f"{account.name} organizational units imported from GPKG",
                    task=None,
                )
                self.stdout.write(
                    self.style.SUCCESS(f"Successfully imported {total_imported} organizational units from GPKG")
                )
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Failed to import GPKG file: {e}"))
                raise

            # Seed interventions
            InterventionSeeder(account, self.stdout.write).create_interventions()

            # Import metrics data (calls import_openhexa_metrics command)
            self.stdout.write(self.style.SUCCESS("You can now run the following command to import metrics data:"))
            self.stdout.write(
                self.style.NOTICE(
                    f"./manage.py import_openhexa_metrics --workspace_slug {account_config['dataset_workspaceslug']} --dataset_slug {account_config['dataset_slug']} --account-id {account.id}"
                )
            )
            self.stdout.write(self.style.SUCCESS("OR this one if you run under docker"))
            self.stdout.write(
                self.style.NOTICE(
                    f"docker compose run --rm iaso manage import_openhexa_metrics --workspace_slug {account_config['dataset_workspaceslug']} --dataset_slug {account_config['dataset_slug']} --account-id {account.id}"
                )
            )

            self.stdout.write(self.style.NOTICE(f"You can now try to login main user: {main_username}"))
            if "password" in locals():
                self.stdout.write(self.style.NOTICE(f"And password: {password}"))
                self.stdout.write(self.style.WARNING("Please change the password after logging in."))
