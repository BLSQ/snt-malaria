import os.path
import sqlite3
import tempfile
import uuid
from pathlib import Path

from typing import Optional

import geopandas as gpd

from django.contrib.auth.models import Permission, User
from django.core.files.uploadedfile import UploadedFile
from django.db import IntegrityError
from django.http import JsonResponse
from django_countries import countries
from rest_framework import status

from iaso.models import Account, DataSource, Profile, Project, SourceVersion
from iaso.modules import MODULE_DEFAULT, MODULE_SNT_MALARIA
from iaso.permissions import core_permissions
from plugins.snt_malaria import permissions as snt_permissions
from plugins.snt_malaria.management.commands.support.intervention_seeder import InterventionSeeder
from plugins.snt_malaria.models import SNTAccountSetup


DEFAULT_MODULES_TO_ACTIVATE = [
    MODULE_DEFAULT,
    MODULE_SNT_MALARIA,
]

GRANTED_PERMISSIONS = [
    snt_permissions.SNT_SCENARIO_BASIC_WRITE_PERMISSION,
    snt_permissions.SNT_SCENARIO_FULL_WRITE_PERMISSION,
    snt_permissions.SNT_SETTINGS_READ_PERMISSION,
    snt_permissions.SNT_SETTINGS_WRITE_PERMISSION,
    core_permissions.CORE_METRIC_TYPES_PERMISSION,
]

REQUIRED_GEO_JSON_LABELS = [
    "ADM1_ID",
    "ADM1_NAME",
    "ADM2_ID",
    "ADM2_NAME",
]


def create_snt_account(
    username: str, password: str, country: str, language: Optional[str], geo_json_file: UploadedFile
):
    # Create a hash to ensure creation of unique objects
    hash = uuid.uuid4().hex[:10]

    new_setup = SNTAccountSetup.objects.create(
        username=username,
        country=country,
        geo_json_file=geo_json_file,
    )

    countries_dict = dict(countries)
    full_country_name = countries_dict[country]

    account_name = f"{full_country_name}-{hash}"

    # Create DataSource and SourceVersion
    try:
        data_source = DataSource.objects.create(name=account_name)
        source_version = SourceVersion.objects.create(data_source=data_source, number=1)
        data_source.default_version = source_version
        data_source.save()
    except IntegrityError:
        return JsonResponse(
            {"error": f"A data source already exists with the name {account_name}"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Create Account with modules
    try:
        account_modules = [module.codename for module in DEFAULT_MODULES_TO_ACTIVATE]
        account = Account.objects.create(name=account_name, modules=account_modules, default_version=source_version)
    except IntegrityError:
        return JsonResponse(
            {"error": f"An account already exists with the name {account_name}"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Create Project
    project = Project.objects.create(name="Main project", account=account, app_id=uuid.uuid4())
    data_source.projects.add(project)

    # Create user & profile, set permissions
    try:
        user = User.objects.create_user(
            username=username,
            password=password,
        )
        permissions = [perm.codename for perm in GRANTED_PERMISSIONS]
        user.user_permissions.set(Permission.objects.filter(codename__in=permissions))
        profile = Profile.objects.create(account=account, user=user)
        if language:
            profile.language = language
            profile.save()
    except IntegrityError:
        return JsonResponse(
            {"error": f"The username {username} is already taken."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    InterventionSeeder(account).create_interventions_for_api_account(user)

    return new_setup


def transform_geo_json_to_gpkg(account_setup: SNTAccountSetup):
    gdf = read_geo_json_file(account_setup)

    adm2 = gdf.copy()

    adm2["id"] = adm2["ADM2_ID"]
    adm2["name"] = adm2["ADM2_NAME"]
    adm2["parent_name"] = adm2["ADM1_NAME"]
    adm2["parent_id"] = adm2["ADM1_ID"]

    adm1 = gdf.dissolve(by=["ADM1_ID", "ADM1_NAME"], as_index=False)

    adm1["id"] = adm1["ADM1_ID"]
    adm1["name"] = adm1["ADM1_NAME"]
    adm1["parent_name"] = gdf["COUNTRY"].iloc[0]
    adm1["parent_id"] = gdf["ADM0_ID"].iloc[0]

    adm0 = gdf.dissolve(by=["ADM0_ID", "COUNTRY"], as_index=False)

    adm0["id"] = adm0["ADM0_ID"]
    adm0["name"] = adm0["COUNTRY"]
    adm0["parent_name"] = None
    adm0["parent_id"] = None

    adm0 = add_uuid_to_dataframe(adm0)
    adm1 = add_uuid_to_dataframe(adm1)
    adm2 = add_uuid_to_dataframe(adm2)

    adm0 = add_extra_columns_to_dataframe(adm0)
    adm1 = add_extra_columns_to_dataframe(adm1)
    adm2 = add_extra_columns_to_dataframe(adm2)

    adm0 = format_df(adm0)
    adm1 = format_df(adm1)
    adm2 = format_df(adm2)

    # adm0 = adm0.rename(columns={"geography": "geometry"})
    # adm1 = adm1.rename(columns={"geography": "geometry"})
    # adm2 = adm2.rename(columns={"geography": "geometry"})

    with tempfile.NamedTemporaryFile(suffix=".gpkg") as tmp:
        tmp_path = tmp.name

        adm0.to_file(tmp_path, layer="level0", driver="GPKG")
        adm1.to_file(tmp_path, layer="level1", driver="GPKG")
        adm2.to_file(tmp_path, layer="level2", driver="GPKG")

        add_empty_groups_table(tmp_path)

        account_setup.gpkg_file.save("org_units.gpkg", open(tmp_path, "rb"))
        account_setup.save()

    # processed_org_units = {}
    #
    # with open(geo_json_file) as file:
    #     geo_json = json.loads(file.read())
    #
    # first_location = geo_json["features"][0]
    # max_level = determine_max_level(first_location)  # we know that we have at least 2 levels thanks to serializer validation
    #
    # Prepare country level, which is not always in the geo json
    # processed_org_units[0] = [{
    #     "ADM0_ID": country_code,
    #     "ADM0_NAME": country_name,
    # }]
    #
    # for org_unit in geo_json["features"]:
    #     process_org_unit(org_unit, max_level, processed_org_units)

    # TODO: build parent geometry based on children

    # level_names = determine_level_names(first_location, max_level)
    # create the gpkg with each level as a separate layer
    # return the gpkg


def read_geo_json_file(account_setup):
    """
    The geopandas.read_file function requires a file path, but depending on the configuration, it might be difficult to provide one:
    - if the file is stored locally, we can use the path directly
    - if the file is stored in memory (like when running tests), there's no path
    - if the file is stored in S3, there's no path

    Basically, this function stores the content of the geo json file into a tmp file stored on disk, and uses
    this tmp file to read the content with geopandas, which allows us to be agnostic about the actual storage of the file.
    """
    suffix = Path(account_setup.geo_json_file.name).suffix

    with account_setup.geo_json_file.open("rb") as f:
        with tempfile.NamedTemporaryFile(suffix=suffix) as tmp:
            for chunk in f.chunks():
                tmp.write(chunk)

            tmp.flush()
            return gpd.read_file(tmp.name)


def add_uuid_to_dataframe(df):
    df["uuid"] = [str(uuid.uuid4()) for _ in range(len(df))]
    return df


EXTRA_COLUMNS = [
    "code",
    "group_refs",
    "group_names",
    "opening_date",
    "closing_date",
]


def add_extra_columns_to_dataframe(df):
    for col in EXTRA_COLUMNS:
        df[col] = None
    return df


FINAL_COLUMNS = [
    "uuid",
    "id",
    "name",
    "parent_id",
    "parent_name",
    "code",
    "group_refs",
    "group_names",
    "opening_date",
    "closing_date",
    "geometry",
]


def format_df(df):
    return df[FINAL_COLUMNS]
    # df = df.rename(columns={"geometry": "geography"})
    # df["parent_id"] = df.get("parent_id", None)
    # return df[FINAL_COLUMNS].rename(columns={"geometry": "geography"})


def add_empty_groups_table(gpkg_path: str) -> None:
    """Create an empty groups table in the GeoPackage for IASO compatibility.

    The groups table must be a non-spatial table registered in gpkg_contents
    as 'attributes' type, not a spatial layer.
    """
    create_groups_table_query = """
    CREATE TABLE IF NOT EXISTS groups (
        fid  INTEGER NOT NULL
            CONSTRAINT groups_pk
                PRIMARY KEY AUTOINCREMENT,
        ref  TEXT    NOT NULL,
        name TEXT    NOT NULL
    );
    """

    insert_table_in_gpkg_content = """
    INSERT INTO gpkg_contents(table_name, data_type, identifier)
    SELECT 'groups', 'attributes', 'groups'
    WHERE NOT EXISTS (SELECT 1 FROM gpkg_contents WHERE table_name = 'groups');
    """

    with sqlite3.connect(gpkg_path) as conn:
        cur = conn.cursor()
        cur.execute(create_groups_table_query)
        cur.execute(insert_table_in_gpkg_content)
        conn.commit()


def determine_max_level(json_location):
    max_level = 0
    for i in range(1, 15):  # we're probably not going to have 15 levels
        if f"ADM{i}_ID" in json_location:
            max_level = i
        else:
            break
    return max_level


def determine_level_names(json_location, max_level):
    level_names = {}
    for level in range(1, max_level + 1):
        key = f"ADM{level}_LEVEL_NAME"
        if key in json_location["properties"]:
            level_names[level] = json_location["properties"][key]
        else:
            level_names[level] = f"ADM{level}"
    return level_names


def process_org_unit(org_unit, max_level, processed_org_units):
    for level in range(1, max_level + 1):
        id_key = f"ADM{level}_ID"
        name_key = f"ADM{level}_NAME"

        current_level_id = org_unit["properties"][id_key]
        current_level_name = org_unit["properties"][name_key]

        if level not in processed_org_units:
            processed_org_units[level] = {}

        if current_level_id not in processed_org_units[level]:
            processed_org_units[level][current_level_id] = {
                id_key: current_level_id,
                name_key: current_level_name,
            }

        if level == max_level:  # we have geometry only for the last level
            processed_org_units[level][current_level_id]["geometry"] = org_unit["geometry"]
