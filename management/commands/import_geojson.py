import json
import os

from django.contrib.gis.geos import GEOSGeometry, MultiPolygon, Polygon
from django.core.management.base import BaseCommand

from iaso.utils.gis import simplify_geom
from iaso.models import *

# FILENAME = "BFA_districts.geojson"
FILE_LOCATION = "pyramids/COD_shp.geojson"


class Command(BaseCommand):
    help = "A v1 script to add the .geojson shapes to the health pyramid"

    def handle(self, *args, **options):
        script_dir = os.path.dirname(os.path.abspath(__file__))
        json_path = os.path.join(script_dir, FILE_LOCATION)
        self.load_json_to_postgis(json_path)

    def load_json_to_postgis(self, json_path):
        with open(json_path, "r") as file:
            data = json.load(file)

        # Add geometries to org units
        for unit in data["features"]:
            source_ref = unit["properties"]["ADM2_ID"]

            try:
                org_unit = OrgUnit.objects.get(source_ref=source_ref)
                # org_unit.geom = MultiPolygon(GEOSGeometry(json.dumps(unit["geometry"])))
                org_unit.geom = GEOSGeometry(json.dumps(unit["geometry"]))
                org_unit.simplified_geom = simplify_geom(org_unit.geom)
                org_unit.save()
                print(f"SUCCESS: parsed geom for source_ref {source_ref}")
            except Exception:
                print(f"ERROR: Can't parse geom for source_ref {source_ref}")
