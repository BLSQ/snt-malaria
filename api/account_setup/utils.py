import sqlite3
import tempfile
import uuid

from pathlib import Path
from typing import Optional

import geopandas as gpd

from django.contrib.auth.models import Permission, User
from django.core.files import File
from django.core.files.uploadedfile import UploadedFile
from django.db import IntegrityError
from django_countries import countries
from rest_framework.exceptions import ValidationError

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
    "ADM0_ID",
    "ADM0_NAME",
    "ADM1_ID",
    "ADM1_NAME",
    "ADM1_LEVEL_NAME",
    "ADM2_ID",
    "ADM2_NAME",
    "ADM2_LEVEL_NAME",
]

GDF_COLUMNS_TO_ADD = [
    "id",
    "code",
    "group_refs",
    "group_names",
    "opening_date",
    "closing_date",
]

GDF_FINAL_COLUMNS = [
    "uuid",
    "id",
    "ref",
    "name",
    "parent_ref",
    "parent_name",
    "code",
    "group_refs",
    "group_names",
    "opening_date",
    "closing_date",
    "geometry",
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
    except IntegrityError as e:
        raise ValidationError(detail=f"A data source already exists with the name {account_name}") from e

    # Create Account with modules
    try:
        account_modules = [module.codename for module in DEFAULT_MODULES_TO_ACTIVATE]
        account = Account.objects.create(name=account_name, modules=account_modules, default_version=source_version)
    except IntegrityError as e:
        raise ValidationError(detail=f"An account already exists with the name {account_name}") from e

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
    except IntegrityError as e:
        raise ValidationError(detail=f"The username {username} is already taken") from e

    InterventionSeeder(account).create_interventions_for_api_account(user)

    new_setup.account = account
    new_setup.save()

    return new_setup


def transform_geo_json_to_gpkg(account_setup: SNTAccountSetup):
    gdf = read_geo_json_file(account_setup)

    adm2 = gdf.copy()

    # TODO: fetch and compute all levels dynamically, in order to have any level > 2
    level_0_name = "Country"
    level_1_name = str(adm2.at[0, "ADM1_LEVEL_NAME"]).strip()
    level_2_name = str(adm2.at[0, "ADM2_LEVEL_NAME"]).strip()

    adm2["ref"] = adm2["ADM2_ID"]
    adm2["name"] = adm2["ADM2_NAME"]
    adm2["parent_name"] = adm2["ADM1_NAME"]
    adm2["parent_ref"] = adm2["ADM1_ID"]

    adm1 = gdf.dissolve(by=["ADM1_ID", "ADM1_NAME"], as_index=False)

    adm1["ref"] = adm1["ADM1_ID"]
    adm1["name"] = adm1["ADM1_NAME"]
    adm1["parent_name"] = gdf["ADM0_NAME"].iloc[0]
    adm1["parent_ref"] = gdf["ADM0_ID"].iloc[0]

    adm0 = gdf.dissolve(by=["ADM0_ID", "ADM0_NAME"], as_index=False)

    adm0["ref"] = adm0["ADM0_ID"]
    adm0["name"] = adm0["ADM0_NAME"]
    adm0["parent_name"] = None
    adm0["parent_ref"] = None

    adm0 = format_gdf_for_iaso(adm0)
    adm1 = format_gdf_for_iaso(adm1)
    adm2 = format_gdf_for_iaso(adm2)

    with tempfile.NamedTemporaryFile(suffix=".gpkg") as tmp:
        tmp_path = tmp.name

        adm0.to_file(tmp_path, layer=f"level-0-{level_0_name}", driver="GPKG")
        adm1.to_file(tmp_path, layer=f"level-1-{level_1_name}", driver="GPKG")
        adm2.to_file(tmp_path, layer=f"level-2-{level_2_name}", driver="GPKG")

        add_empty_groups_table(tmp_path)

        with open(tmp_path, "rb") as f:
            account_setup.gpkg_file.save("org_units.gpkg", File(f))
            account_setup.save()


def read_geo_json_file(account_setup: SNTAccountSetup):
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


def format_gdf_for_iaso(gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    """
    Adds the required columns for a IASO gpkg and removes other columns
    """
    gdf["uuid"] = [str(uuid.uuid4()) for _ in range(len(gdf))]
    for col in GDF_COLUMNS_TO_ADD:
        gdf[col] = None
    return gdf[GDF_FINAL_COLUMNS]


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
