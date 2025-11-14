"""
Django management command to transform health pyramid data file and GeoJSON to GeoPackage format.

The pyramid file can be in .parquet or .csv format.
The result is a GeoPackage (.gpkg) file compatible with IASO.

Before usage:

    pip install pyarrow fastparquet
    pip install --upgrade geopandas

Example usage:
    ./manage.py transform_health_pyramid \
        --pyramid-file plugins/snt_malaria/NER_pyramid.parquet \
        --geojson-file plugins/snt_malaria/NER_shapes.geojson \
        --output-file plugins/snt_malaria/NER_health_pyramid.gpkg
"""

import sqlite3

from pathlib import Path
from typing import List

import geopandas as gpd
import pandas as pd

from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Transform health pyramid data file and GeoJSON to GeoPackage format"

    def add_arguments(self, parser):
        parser.add_argument(
            "--pyramid-file", type=str, required=True, help="Path to the pyramid file (.parquet or .csv)"
        )
        parser.add_argument("--geojson-file", type=str, required=True, help="Path to the GeoJSON file")
        parser.add_argument(
            "--output-file", type=str, help="Path for the output GeoPackage file (default: output.gpkg)"
        )
        parser.add_argument(
            "--levels",
            type=str,
            default="1,2,3",
            help="Comma-separated list of pyramid levels to include (default: 1,2,3)",
        )

    def handle(self, *args, **options):
        """Main command handler."""
        try:
            # Parse levels
            levels = [int(x.strip()) for x in options["levels"].split(",")]
            self.stdout.write(f"Processing levels: {levels}")

            # Set file paths
            plugin_dir = Path(__file__).parent.parent.parent
            pyramid_path = options["pyramid_file"]
            geojson_path = options["geojson_file"]
            output_path = options["output_file"] or str(plugin_dir / "output.gpkg")

            # Check if input files exist
            if not Path(pyramid_path).exists():
                raise CommandError(f"Pyramid file not found: {pyramid_path}")

            if not Path(geojson_path).exists():
                raise CommandError(f"GeoJSON file not found: {geojson_path}")

            self.stdout.write("Starting transformation to GeoPackage...")

            # Read input files
            pyramid_df = self.read_pyramid_file(pyramid_path)
            shapes_gdf = self.read_geojson_file(geojson_path)

            # # Changes for Nigeria from IDM data:
            # # Add LEVEL_1_ID and LEVEL_2_ID
            # pyramid_df["LEVEL_1_ID"] = pyramid_df["LEVEL_1_NAME"]
            # pyramid_df["LEVEL_2_ID"] = pyramid_df["LEVEL_2_NAME"]
            # # Construct the ADM1_ID and ADM2_ID keys
            # shapes_gdf["ADM1_ID"] = shapes_gdf["State"]
            # shapes_gdf["ADM1_NAME"] = shapes_gdf["State"]
            # shapes_gdf["ADM2_ID"] = shapes_gdf["State"] + ":" + shapes_gdf["LGA"]
            # shapes_gdf["ADM2_NAME"] = shapes_gdf["LGA"]

            # Filter pyramid data to specified levels
            filtered_pyramid = self.filter_pyramid_levels(pyramid_df, levels)

            # Merge pyramid data with shapes
            merged_gdf = shapes_gdf.merge(
                filtered_pyramid,
                left_on="ADM2_ID",
                right_on="LEVEL_3_ID",
                how="left",
            )

            # Transform to IASO format and write to GeoPackage
            try:
                self.write_iaso_format_gpkg(merged_gdf, output_path)
                self.stdout.write(f"Successfully wrote GeoPackage: {output_path}")
            except Exception as e:
                raise CommandError(f"Error writing GeoPackage: {e}")

            # Add empty groups table for IASO compatibility
            self.add_empty_groups_table(output_path)

            self.stdout.write(self.style.SUCCESS(f"Successfully created GeoPackage: {output_path}"))

        except Exception as e:
            raise CommandError(f"Transformation failed: {e}")

    def read_pyramid_file(self, pyramid_path: str) -> pd.DataFrame:
        """Read pyramid file (parquet or CSV) and return DataFrame."""
        file_path = Path(pyramid_path)
        file_extension = file_path.suffix.lower()

        try:
            if file_extension == ".parquet":
                df = pd.read_parquet(pyramid_path)
                self.stdout.write(f"Successfully read parquet file: {pyramid_path}")
            elif file_extension == ".csv":
                df = pd.read_csv(pyramid_path)
                self.stdout.write(f"Successfully read CSV file: {pyramid_path}")
            else:
                raise CommandError(
                    f"Unsupported file format: {file_extension}. Please provide a .parquet or .csv file."
                )

            self.stdout.write(f"\tShape: {df.shape}")
            self.stdout.write(f"\tColumns: {df.columns.tolist()}")
            return df
        except ImportError as e:
            raise CommandError(f"Missing dependency: {e}")
        except Exception as e:
            raise CommandError(f"Error reading pyramid file: {e}")

    def read_geojson_file(self, geojson_path: str) -> gpd.GeoDataFrame:
        """Read GeoJSON file and return GeoDataFrame."""
        try:
            gdf = gpd.read_file(geojson_path)
            self.stdout.write(f"Successfully read GeoJSON file: {geojson_path}")
            self.stdout.write(f"\tShape: {gdf.shape}")
            self.stdout.write(f"\tColumns: {gdf.columns.tolist()}")
            return gdf
        except Exception as e:
            raise CommandError(f"Error reading GeoJSON file: {e}")

    def filter_pyramid_levels(self, df: pd.DataFrame, levels: List[int] = [1, 2, 3]) -> pd.DataFrame:
        """
        Filter the pyramid DataFrame to include only specified levels and get unique values.

        Args:
            df: Input DataFrame from parquet file
            levels: List of levels to include (default: [1, 2, 3])

        Returns:
            DataFrame with unique combinations for the specified levels
        """
        # Find level columns using the actual column naming pattern
        # Always include level 0 (country) if it exists
        all_levels = [0] + levels if 0 not in levels else levels
        level_columns = []
        for level in all_levels:
            # Add both ID and NAME columns for each level
            name_col = f"LEVEL_{level}_NAME"
            id_col = f"LEVEL_{level}_ID"

            if name_col in df.columns:
                level_columns.append(name_col)
            if id_col in df.columns:
                level_columns.append(id_col)

        if not level_columns:
            self.stdout.write(self.style.WARNING("No level columns found. Available columns:"))
            self.stdout.write(str(df.columns.tolist()))
            self.stdout.write("First few rows:")
            self.stdout.write(str(df.head()))
            return df

        self.stdout.write(f"Found level columns: {level_columns}")

        # Get unique combinations of the level columns
        unique_df = df[level_columns].drop_duplicates().reset_index(drop=True)
        self.stdout.write(f"Unique combinations: {len(unique_df)}")

        return unique_df

    def write_iaso_format_gpkg(self, gdf: gpd.GeoDataFrame, output_path: str) -> None:
        """
        Transform the GeoDataFrame to IASO export format and write to GeoPackage.

        This method formats the data to match the structure expected by IASO imports,
        following the pattern in iaso/gpkg/export_gpkg.py
        Creates level 0 (Country), level 1 (Region), and level 2 (District) layers.
        """
        # IASO expected columns (from OUT_COLUMNS in export_gpkg.py)
        iaso_columns = [
            "name",
            "ref",
            "code",
            "geography",
            "parent",
            "parent_ref",
            "group_refs",
            "group_names",
            "uuid",
            "opening_date",
            "closed_date",
        ]

        import uuid

        # Create Level 0 (Country) layer - extract from parquet data
        self.stdout.write("Creating level 0 (Country) layer...")

        # Get unique country from the merged data
        countries = gdf[["LEVEL_1_NAME", "LEVEL_1_ID"]].drop_duplicates()
        country_names = countries["LEVEL_1_NAME"].dropna().tolist()
        country_refs = countries["LEVEL_1_ID"].dropna().tolist()

        country_df = gpd.GeoDataFrame(
            {
                "name": country_names,
                "ref": country_refs,
                "code": country_refs,
                "geography": [None] * len(country_names),  # No geometry for country level
                "parent": [None] * len(country_names),
                "parent_ref": [None] * len(country_names),
                "group_refs": [None] * len(country_names),
                "group_names": [None] * len(country_names),
                "uuid": [str(uuid.uuid4()) for _ in range(len(country_names))],
                "opening_date": [None] * len(country_names),
                "closed_date": [None] * len(country_names),
            }
        )
        country_gdf = gpd.GeoDataFrame(country_df[iaso_columns], geometry="geography", crs="EPSG:4326")
        country_gdf.to_file(output_path, driver="GPKG", layer="level-0-Country")
        self.stdout.write(f"Written {len(country_gdf)} country feature(s)")

        # Create Level 1 (Region) layer - extract unique regions from the data
        self.stdout.write("Creating level 1 (Region) layer...")

        # Get unique regions from the merged data
        if "ADM1_NAME" in gdf.columns and "ADM1_ID" in gdf.columns:
            regions = gdf[["ADM1_NAME", "ADM1_ID"]].drop_duplicates()
            region_names = regions["ADM1_NAME"].tolist()
            region_refs = regions["ADM1_ID"].tolist()
        elif "LEVEL_1_NAME" in gdf.columns and "LEVEL_1_ID" in gdf.columns:
            regions = gdf[["LEVEL_1_NAME", "LEVEL_1_ID"]].drop_duplicates()
            region_names = regions["LEVEL_1_NAME"].tolist()
            region_refs = regions["LEVEL_1_ID"].tolist()
        else:
            # Fallback if no region data available
            region_names = ["Unknown Region"]
            region_refs = ["unknown_region"]

        region_df = gpd.GeoDataFrame(
            {
                "name": region_names,
                "ref": region_refs,
                "code": region_refs,
                "geography": [None] * len(region_names),  # No geometry for region level
                "parent": [country_names[0]] * len(region_names),  # Parent is the country
                "parent_ref": [country_refs[0]] * len(region_names),
                "group_refs": [None] * len(region_names),
                "group_names": [None] * len(region_names),
                "uuid": [str(uuid.uuid4()) for _ in range(len(region_names))],
                "opening_date": [None] * len(region_names),
                "closed_date": [None] * len(region_names),
            }
        )
        region_gdf = gpd.GeoDataFrame(region_df[iaso_columns], geometry="geography", crs="EPSG:4326")
        region_gdf.to_file(output_path, driver="GPKG", layer="level-1-Region")
        # Nigeria
        # region_gdf.to_file(output_path, driver="GPKG", layer="level-1-State")
        self.stdout.write(f"Written {len(region_gdf)} region features")

        # Create Level 2 (District) layer - the main data with geometry
        self.stdout.write("Creating level 2 (District) layer...")

        # Create a new DataFrame with IASO format for districts
        iaso_df = gpd.GeoDataFrame()

        # Map the existing columns to IASO format
        # Use ADM2_NAME as the org unit name (district level)
        if "ADM2_NAME" in gdf.columns:
            iaso_df["name"] = gdf["ADM2_NAME"]
        elif "LEVEL_2_NAME" in gdf.columns:
            iaso_df["name"] = gdf["LEVEL_2_NAME"]
        else:
            iaso_df["name"] = "Unknown"

        # Create ref from ADM2_ID or generate one
        if "ADM2_ID" in gdf.columns:
            iaso_df["ref"] = gdf["ADM2_ID"]
        elif "LEVEL_2_ID" in gdf.columns:
            iaso_df["ref"] = gdf["LEVEL_2_ID"]
        else:
            # Generate refs if not available
            iaso_df["ref"] = [f"generated_{i}" for i in range(len(gdf))]

        # Set code (can be same as ref or empty)
        iaso_df["code"] = iaso_df["ref"]

        # Use geometry column for geography
        iaso_df["geography"] = gdf["geometry"]

        # Set parent information (use ADM1 as parent)
        if "ADM1_NAME" in gdf.columns:
            iaso_df["parent"] = gdf["ADM1_NAME"]
        elif "LEVEL_1_NAME" in gdf.columns:
            iaso_df["parent"] = gdf["LEVEL_1_NAME"]
        else:
            iaso_df["parent"] = "Unknown Parent"

        # Set parent_ref
        if "ADM1_ID" in gdf.columns:
            iaso_df["parent_ref"] = gdf["ADM1_ID"]
        elif "LEVEL_1_ID" in gdf.columns:
            iaso_df["parent_ref"] = gdf["LEVEL_1_ID"]
        else:
            iaso_df["parent_ref"] = None

        # Initialize empty group columns
        iaso_df["group_refs"] = None
        iaso_df["group_names"] = None

        # Generate UUIDs for each org unit
        iaso_df["uuid"] = [str(uuid.uuid4()) for _ in range(len(gdf))]

        # Initialize empty opening/closing dates
        iaso_df["opening_date"] = None
        iaso_df["closed_date"] = None

        # Keep only the columns that IASO expects and set geometry
        iaso_gdf = gpd.GeoDataFrame(iaso_df[iaso_columns], geometry="geography", crs="EPSG:4326")

        # Remove any rows with null geometry
        iaso_gdf = iaso_gdf[iaso_gdf["geography"].notna()]

        self.stdout.write(f"Writing {len(iaso_gdf)} district features")

        # Write to GeoPackage following IASO format
        iaso_gdf.to_file(output_path, driver="GPKG", layer="level-2-District")
        # Nigeria
        # iaso_gdf.to_file(output_path, driver="GPKG", layer="level-2-LGA")

    def add_empty_groups_table(self, gpkg_path: str) -> None:
        """Create an empty groups table in the GeoPackage for IASO compatibility."""
        create_groups_table_query = """
        CREATE TABLE groups (
            fid  INTEGER NOT NULL
                CONSTRAINT groups_pk
                    PRIMARY KEY AUTOINCREMENT,
            ref  TEXT    NOT NULL,
            name TEXT    NOT NULL
        );
        """

        insert_table_in_gpkg_content = """
        INSERT INTO gpkg_contents(table_name, data_type, identifier) VALUES (
            'groups',
            'attributes',
            'groups'
        );
        """

        try:
            with sqlite3.connect(gpkg_path) as conn:
                cur = conn.cursor()
                # Check if groups table already exists
                cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='groups';")
                table_exists = cur.fetchone()

                if not table_exists:
                    cur.execute(create_groups_table_query)
                    cur.execute(insert_table_in_gpkg_content)
                    conn.commit()
                    self.stdout.write("Successfully created empty groups table")
                else:
                    self.stdout.write("Groups table already exists, skipping creation")
        except Exception as e:
            raise CommandError(f"Error creating groups table: {e}")
