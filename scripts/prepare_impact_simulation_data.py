import os
import sys

import django

from django.db import connection

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "hat.settings")
django.setup()

from iaso.models import Account, OrgUnit, OrgUnitType


def normalize_name(name):
    return name.replace(" ", "").replace("-", "").replace("/", "").lower()


print("Fetching Nigeria LGAs...")

account = Account.objects.get(name="Nigeria")

# Get LGA org unit type
try:
    lga_org_unit_type = OrgUnitType.objects.get(name="LGA")
    print(f"Found OrgUnitType: {lga_org_unit_type.name} (ID: {lga_org_unit_type.id})")
except OrgUnitType.DoesNotExist:
    print("Error: LGA OrgUnitType not found")
    sys.exit(1)

# Get all valid LGA orgunits in Nigeria with their parent (state) name
org_units = OrgUnit.objects.filter(
    org_unit_type=lga_org_unit_type,
    version=account.default_version,
    validation_status="VALID",
).select_related("parent")

org_units_list = list(org_units)
print(f"Found {len(org_units_list)} valid LGA OrgUnits")
print("-" * 80)

uuid_matchings = {}

# Iterate over each LGA and lookup in IDM's admin_info table
matched_count = 0
unmatched_count = 0
unmatched_lgas = []

with connection.cursor() as cursor:
    for org_unit in org_units_list:
        lga_name = org_unit.name
        state_name = org_unit.parent.name

        normalized_lga = normalize_name(lga_name)
        normalized_state = normalize_name(state_name)

        # Lookup in admin_info table matching both admin_2_name and state
        # Normalize by removing spaces, dashes, and slashes for comparison
        cursor.execute(
            """
            SELECT id
            FROM idm_dashboard.admin_info
            WHERE LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(admin_2_name, '2', ''), '1', ''), ' ', ''), '-', ''), '/', '')) = %s
              AND LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(state, '2', ''), '1', ''), ' ', ''), '-', ''), '/', '')) = %s
            """,
            (normalized_lga, normalized_state),
        )

        result = cursor.fetchone()

        if result:
            matched_count += 1
            uuid_matchings[result[0]] = org_unit.uuid
        else:
            unmatched_count += 1
            unmatched_lgas.append((lga_name, state_name))
            print(f"✗ NOT FOUND: {lga_name} (State: {state_name})")

print("-" * 80)
print("\nSummary:")
print(f"  Total LGAs: {len(org_units_list)}")
print(f"  Matched: {matched_count}")
print(f"  Unmatched: {unmatched_count}")
print("-" * 80)

if len(set(uuid_matchings.keys())) == len(org_units_list):
    # INSERT QUERY
else:
    print("Error: Match count not equal to OU count")


print("\nDone!")
