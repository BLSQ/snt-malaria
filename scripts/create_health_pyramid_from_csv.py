import csv
import os

import requests


"""
Disclaimer: This script is a work in progress. There are many ways to improve and
make this script more generic. For the time being, you can set it up as follows:

1. Put all data in a CSV with column names:
    - "partner" this will become the OU groups
    - For each OrgUnitType: short_name
2. Make sure SERVER_BASE_URL and AUTH_TOKEN are correctly configured to your
   desired server.
"""

SERVER_BASE_URL = "https://server.org"

orgunits_url = SERVER_BASE_URL + "/api/orgunits/"
groups_url = SERVER_BASE_URL + "/api/groups/"
create_org_unit_url = SERVER_BASE_URL + "/api/orgunits/create_org_unit/"
org_unit_types_url = SERVER_BASE_URL + "/api/v2/orgunittypes/"

AUTH_TOKEN = "XXX"
headers = {"Authorization": "Bearer %s" % AUTH_TOKEN}

SOURCE_ID = 2  # ID of the default source
# To use this script in it's current form, you need to add this file to the current dir
CSV_NAME = "COD_pyramid.csv"
current_dir = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(current_dir, CSV_NAME)


def csv_to_dict(filename):
    with open(filename, newline="") as csvfile:
        reader = csv.DictReader(csvfile)
        return [{k: v.strip() for k, v in row.items()} for row in reader]


def get_group_id_by_name(groups, name):
    for group in groups:
        if group["name"] == name:
            return group["id"]
    return None


def find_or_create_org_unit(name, org_unit_type_id, parent_id, source_ref=None, group_id=None):
    # search_url = (
    #     orgunits_url
    #     + f'?limit=20&order=id&page=1&searches=[{{"validation_status":"VALID","search":"{name}","source":{SOURCE_ID},"orgUnitTypeId":"{org_unit_type_id}","orgUnitParentId":"{parent_id}"}}]'
    # )
    # response = requests.get(search_url, headers=headers)

    # result_count = response.json()["count"]
    # TEMP: Disable the find, only create
    result_count = 0
    if result_count == 0:
        # Creating new org unit
        payload = {
            "id": None,
            "name": name,
            "org_unit_type_id": org_unit_type_id,
            "groups": [group_id] if group_id else [],
            "sub_source": None,
            "aliases": [],
            "validation_status": "VALID",
            "parent_id": parent_id,
            "source_ref": source_ref,
        }
        resp = requests.post(create_org_unit_url, headers=headers, json=payload)
        if resp.status_code != 200:
            raise Exception(f"Failed to create org unit: {resp.status_code} - {resp.text}")
        return resp.json()["id"]
    if result_count > 1:
        raise Exception(f"Found multiple results for {name}")
    # Return existing org unit
    return response.json()["orgunits"][0]["id"]


# Call the function with your csv file path
rows = csv_to_dict(CSV_PATH)


# Groups
# groups = {}
# print("Fetching group ids, create groups if needed")

# groups_in_csv = set([row["partner"] for row in rows])
# existing_groups = requests.get(groups_url, headers=headers).json()["groups"]
# existing_group_names = set([g["name"] for g in existing_groups])

# for group_name in groups_in_csv:
#     if group_name in existing_group_names:
#         groups[group_name] = get_group_id_by_name(existing_groups, group_name)
#     else:
#         print(f"\tcreating group: {group_name}")
#         payload = {"name": group_name, "source_ref": ""}
#         response = requests.post(groups_url, headers=headers, json=payload)
#         groups[group_name] = response.json()["id"]

# print("Groups", groups)

# OU Types
print("Fetching OU types")
ou_types = {}
response = requests.get(org_unit_types_url, headers=headers).json()["orgUnitTypes"]
for out in response:
    ou_types[out["depth"]] = out
# sort on level
ou_types = {k: ou_types[k] for k in sorted(ou_types)}
print("OU types:")
for level, ou_type in ou_types.items():
    print(f"Level {level}: {ou_type['name']}")


# PARENT_LEVEL_3_ID,PARENT_LEVEL_3_NAME


import csv

from collections import defaultdict


# Function to create a nested dictionary
def nested_dict():
    return defaultdict(nested_dict)


# Function to convert nested defaultdicts to regular dictionaries
def dictify(d):
    if isinstance(d, defaultdict):
        d = {k: dictify(v) for k, v in d.items()}
    return d


# Initialize the nested dictionary
hierarchy = nested_dict()

# Read CSV and build the hierarchy
with open(CSV_PATH, newline="") as csvfile:
    reader = csv.DictReader(csvfile)
    for row in reader:
        # Access each level by its name and ID
        level_1 = (row["PARENT_LEVEL_1_ID"], row["PARENT_LEVEL_1_NAME"])  # Country
        level_2 = (row["PARENT_LEVEL_2_ID"], row["PARENT_LEVEL_2_NAME"])  # Region / Province
        level_3 = (row["PARENT_LEVEL_3_ID"], row["PARENT_LEVEL_3_NAME"])  # Province / Zone de santé
        # level_4 = (row["PARENT_LEVEL_4_ID"], row["PARENT_LEVEL_4_NAME"])  # District
        # level_5 = (row["PARENT_LEVEL_5_ID"], row["PARENT_LEVEL_5_NAME"])  # Commune
        # level_6 = (
        #     row["PARENT_LEVEL_6_ID"],
        #     row["PARENT_LEVEL_6_NAME"],
        # )  # Formation sanitaire
        # level_7 = (row["PARENT_LEVEL_7_ID"], row["PARENT_LEVEL_7_NAME"])  # Unknown

        # Insert into hierarchy
        # current_level = hierarchy[level_1][level_2][level_3][level_4][level_5][level_6][level_7]
        current_level = hierarchy[level_1][level_2][level_3]

# Convert to regular dictionary
nested_hierarchy = dictify(hierarchy)


# Process the pyramid, create OUs and print out results
def process_hierarchy(d, level=1, parent_id=None):
    for key, value in d.items():
        ou_source_ref, ou_name = key  # Unpack the tuple
        if not ou_name:
            continue

        print("  " * (level - 1) + f"{ou_name} (REF: {ou_source_ref})")
        org_unit_id = find_or_create_org_unit(
            name=ou_name,
            org_unit_type_id=ou_types[level]["id"],
            parent_id=parent_id,
            source_ref=ou_source_ref,
        )
        if isinstance(value, dict):
            process_hierarchy(value, level + 1, org_unit_id)


process_hierarchy(nested_hierarchy)
