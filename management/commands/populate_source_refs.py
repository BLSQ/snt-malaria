import json

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from iaso.models import Account, OrgUnit


class Command(BaseCommand):
    help = (
        "Populate source_ref on org units for a given account using a JSON "
        "mapping file. The file maps org unit names (as they appear in Iaso) "
        "to the corresponding identifier in the impact data source. "
        "Org units whose name is not in the mapping keep their own name as source_ref."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--account",
            type=str,
            required=True,
            help="Name of the account whose org units should be updated.",
        )
        parser.add_argument(
            "--mapping-file",
            type=str,
            required=True,
            help="Path to a JSON file mapping Iaso org unit names to impact source references.",
        )
        parser.add_argument(
            "--overwrite",
            action="store_true",
            default=False,
            help="Overwrite source_ref even if it is already set.",
        )

    def handle(self, *args, **options):
        account_name = options["account"]
        mapping_file_path = options["mapping_file"]
        overwrite = options["overwrite"]

        try:
            with open(mapping_file_path) as f:
                name_mapping = json.load(f)
        except FileNotFoundError:
            raise CommandError(f"Mapping file not found: {mapping_file_path}")
        except json.JSONDecodeError as e:
            raise CommandError(f"Invalid JSON in mapping file: {e}")

        try:
            account = Account.objects.get(name=account_name)
        except Account.DoesNotExist:
            raise CommandError(f"Account '{account_name}' does not exist.")

        default_version = account.default_version
        if default_version is None:
            raise CommandError(f"Account '{account_name}' has no default version.")

        org_units = OrgUnit.objects.filter(version=default_version)
        if not overwrite:
            org_units = org_units.filter(source_ref__isnull=True) | org_units.filter(source_ref="")

        total = org_units.count()
        if total == 0:
            self.stdout.write(self.style.WARNING("No org units to update."))
            return

        updated_count = 0
        with transaction.atomic():
            for org_unit in org_units.iterator():
                org_unit.source_ref = name_mapping.get(org_unit.name, org_unit.name)
                org_unit.save(update_fields=["source_ref"])
                updated_count += 1

        self.stdout.write(
            self.style.SUCCESS(f"Updated source_ref on {updated_count} org units for account '{account_name}'.")
        )
