import json
import os

from django.contrib.gis.geos import GEOSGeometry, MultiPolygon
from django.core.management.base import BaseCommand

from iaso.models import *
from iaso.utils.gis import simplify_geom


FILE_LOCATION = "support/rdc_LGA_boundaries.geojson"


class Command(BaseCommand):
    help = "Import Nigerian LGA boundaries from GeoJSON and create State and LGA org units"

    def add_arguments(self, parser):
        parser.add_argument("--account_id", type=int, required=True, help="Account ID for the org units")
        parser.add_argument(
            "--dry-run", action="store_true", help="Show what would be created without actually creating it"
        )

    def handle(self, *args, **options):
        account_id = options["account_id"]
        dry_run = options["dry_run"]

        try:
            account = Account.objects.get(id=account_id)
        except Account.DoesNotExist:
            self.stderr.write(f"Account with ID {account_id} does not exist")
            return

        script_dir = os.path.dirname(os.path.abspath(__file__))
        json_path = os.path.join(script_dir, FILE_LOCATION)

        if not os.path.exists(json_path):
            self.stderr.write(f"GeoJSON file not found: {json_path}")
            return

        self.load_json_to_postgis(json_path, account, dry_run)

    def load_json_to_postgis(self, json_path, account, dry_run):
        with open(json_path) as file:
            data = json.load(file)

        # Get or create OrgUnitTypes
        state_type, created = OrgUnitType.objects.get_or_create(
            name="State", defaults={"short_name": "State", "depth": 1}
        )
        if created and not dry_run:
            self.stdout.write(f"Created OrgUnitType: {state_type.name}")

        lga_type, created = OrgUnitType.objects.get_or_create(name="LGA", defaults={"short_name": "LGA", "depth": 2})
        if created and not dry_run:
            self.stdout.write(f"Created OrgUnitType: {lga_type.name}")

        # Process features to create org units
        states_created = set()
        lgas_processed = 0

        self.stdout.write(f"Processing {len(data['features'])} features...")

        for feature in data["features"]:
            properties = feature["properties"]
            state_name = properties["statename"]
            lga_name = properties["lganame"]
            lga_code = properties["lgacode"]
            state_code = properties["statecode"]

            if dry_run:
                self.stdout.write(f"Would create/update: State '{state_name}' and LGA '{lga_name}'")
                continue

            # Create or get State org unit
            state_org_unit, state_created = OrgUnit.objects.get_or_create(
                name=state_name,
                org_unit_type=state_type,
                defaults={
                    "source_ref": state_code,
                    "version": account.default_version,
                    "validation_status": OrgUnit.VALIDATION_VALID,
                },
            )

            if state_created:
                states_created.add(state_name)
                self.stdout.write(f"Created State org unit: {state_name}")

            # Create or get LGA org unit
            lga_org_unit, lga_created = OrgUnit.objects.get_or_create(
                name=lga_name,
                org_unit_type=lga_type,
                parent=state_org_unit,
                defaults={
                    "source_ref": lga_code,
                    "version": account.default_version,
                    "validation_status": OrgUnit.VALIDATION_VALID,
                },
            )

            # Add geometry to LGA
            try:
                geom = GEOSGeometry(json.dumps(feature["geometry"]))
                # Convert Polygon to MultiPolygon if needed
                if geom.geom_type == 'Polygon':
                    geom = MultiPolygon(geom)
                
                lga_org_unit.geom = geom
                lga_org_unit.simplified_geom = simplify_geom(lga_org_unit.geom)
                lga_org_unit.save()
                lgas_processed += 1

                if lga_created:
                    self.stdout.write(f"Created LGA org unit: {lga_name} in {state_name}")
                else:
                    self.stdout.write(f"Updated LGA geometry: {lga_name} in {state_name}")

            except Exception as e:
                self.stderr.write(f"ERROR: Failed to process LGA {lga_name}: {str(e)}")

        if not dry_run:
            self.stdout.write("\nSummary:")
            self.stdout.write(f"- States created: {len(states_created)}")
            self.stdout.write(f"- LGAs processed: {lgas_processed}")
            self.stdout.write(f"- Total features: {len(data['features'])}")
        else:
            self.stdout.write(f"\nDry run completed. Would process {len(data['features'])} features.")
