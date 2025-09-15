"""
Django management command to transform health pyramid parquet file and GeoJSON to GeoPackage format.

This command transforms the NER_pyramid.parquet file together with NER_shapes.geojson
to create a GeoPackage (.gpkg) file compatible with IASO.
"""

import json
import sqlite3
import sys
from pathlib import Path
from typing import Dict, List, Optional

import pandas as pd
import geopandas as gpd
from django.core.management.base import BaseCommand, CommandError
from shapely.geometry import shape


class Command(BaseCommand):
    help = "Transform health pyramid parquet file and GeoJSON to GeoPackage format"

    def add_arguments(self, parser):
        parser.add_argument(
            "--parquet-file",
            type=str,
            help="Path to the parquet file (default: NER_pyramid.parquet in plugin directory)",
        )
        parser.add_argument(
            "--geojson-file",
            type=str,
            help="Path to the GeoJSON file (default: NER_shapes.geojson in plugin directory)",
        )
        parser.add_argument(
            "--output-file",
            type=str,
            help="Path for the output GeoPackage file (default: output.gpkg in plugin directory)",
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

            # Set default file paths
            plugin_dir = Path(__file__).parent.parent.parent
            parquet_path = options["parquet_file"] or str(plugin_dir / "NER_pyramid.parquet")
            geojson_path = options["geojson_file"] or str(plugin_dir / "NER_shapes.geojson")
            output_path = options["output_file"] or str(plugin_dir / "output.gpkg")

            # Check if input files exist
            if not Path(parquet_path).exists():
                raise CommandError(f"Parquet file not found: {parquet_path}")

            if not Path(geojson_path).exists():
                raise CommandError(f"GeoJSON file not found: {geojson_path}")

            self.stdout.write("Starting transformation to GeoPackage...")

            # Read input files
            pyramid_df = self.read_parquet_file(parquet_path)
            shapes_gdf = self.read_geojson_file(geojson_path)

            # Filter pyramid data to specified levels
            filtered_pyramid = self.filter_pyramid_levels(pyramid_df, levels)

            print("filtered_pyramid count", len(filtered_pyramid))
            print("filtered_pyramid", filtered_pyramid.head())

            # Merge pyramid data with shapes (if possible)
            merged_gdf = self.merge_pyramid_with_shapes(filtered_pyramid, shapes_gdf)

            # Transform to IASO format and write to GeoPackage
            try:
                self.write_iaso_format_gpkg(merged_gdf, output_path)
                self.stdout.write(f"Successfully wrote GeoPackage: {output_path}")
            except Exception as e:
                raise CommandError(f"Error writing GeoPackage: {e}")

            # Add empty groups table for IASO compatibility
            self.create_groups_table(output_path)

            self.stdout.write(self.style.SUCCESS(f"Successfully created GeoPackage: {output_path}"))

        except Exception as e:
            raise CommandError(f"Transformation failed: {e}")

    def read_parquet_file(self, parquet_path: str) -> pd.DataFrame:
        """Read parquet file and return DataFrame."""
        try:
            df = pd.read_parquet(parquet_path)
            self.stdout.write(f"Successfully read parquet file: {parquet_path}")
            self.stdout.write(f"Shape: {df.shape}")
            self.stdout.write(f"Columns: {df.columns.tolist()}")
            return df
        except ImportError as e:
            raise CommandError(f"Missing dependency for parquet support: {e}")
        except Exception as e:
            raise CommandError(f"Error reading parquet file: {e}")

    def read_geojson_file(self, geojson_path: str) -> gpd.GeoDataFrame:
        """Read GeoJSON file and return GeoDataFrame."""
        try:
            gdf = gpd.read_file(geojson_path)
            self.stdout.write(f"Successfully read GeoJSON file: {geojson_path}")
            self.stdout.write(f"Shape: {gdf.shape}")
            self.stdout.write(f"Columns: {gdf.columns.tolist()}")
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
        level_columns = []
        for level in levels:
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

    def create_groups_table(self, gpkg_path: str) -> None:
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

    def merge_pyramid_with_shapes(self, pyramid_df: pd.DataFrame, shapes_gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
        """
        Merge pyramid data with shapes based on common identifiers.

        This function attempts to match the pyramid data with the GeoJSON shapes
        using available common columns like administrative unit names or IDs.
        """
        # Try to identify common columns for merging
        pyramid_cols = set(pyramid_df.columns)
        shapes_cols = set(shapes_gdf.columns)
        common_cols = pyramid_cols & shapes_cols

        self.stdout.write(f"Common columns: {common_cols}")

        if not common_cols:
            self.stdout.write("No common columns found for merging.")
            self.stdout.write(f"Pyramid columns: {pyramid_cols}")
            self.stdout.write(f"Shapes columns: {shapes_cols}")

            # Try to find logical matches between pyramid and shape columns
            merge_pairs = []

            # Check for ADM1 level matching
            if "LEVEL_1_NAME" in pyramid_cols and "ADM1_NAME" in shapes_cols:
                merge_pairs.append(("LEVEL_1_NAME", "ADM1_NAME"))
            if "LEVEL_1_ID" in pyramid_cols and "ADM1_ID" in shapes_cols:
                merge_pairs.append(("LEVEL_1_ID", "ADM1_ID"))

            # Check for ADM2 level matching
            if "LEVEL_2_NAME" in pyramid_cols and "ADM2_NAME" in shapes_cols:
                merge_pairs.append(("LEVEL_2_NAME", "ADM2_NAME"))
            if "LEVEL_2_ID" in pyramid_cols and "ADM2_ID" in shapes_cols:
                merge_pairs.append(("LEVEL_2_ID", "ADM2_ID"))

            if merge_pairs:
                self.stdout.write(f"Found potential merge pairs: {merge_pairs}")
                # Use the first available merge pair
                pyramid_col, shapes_col = merge_pairs[0]
                self.stdout.write(f"Merging {pyramid_col} with {shapes_col}")

                # Perform the merge using different column names
                merged_gdf = shapes_gdf.merge(pyramid_df, left_on=shapes_col, right_on=pyramid_col, how="left")
                self.stdout.write(f"Merged shape: {merged_gdf.shape}")
                return merged_gdf
            else:
                self.stdout.write("No logical merge pairs found. Returning shapes only.")
                return shapes_gdf

        # Use the first common column for merging
        merge_col = list(common_cols)[0]
        self.stdout.write(f"Merging on column: {merge_col}")

        # Perform the merge
        merged_gdf = shapes_gdf.merge(pyramid_df, on=merge_col, how="left")
        self.stdout.write(f"Merged shape: {merged_gdf.shape}")

        return merged_gdf

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

        # Create Level 0 (Country) layer
        self.stdout.write("Creating level 0 (Country) layer...")
        country_df = gpd.GeoDataFrame(
            {
                "name": ["Niger"],
                "ref": ["NER"],
                "code": ["NER"],
                "geography": [None],  # No geometry for country level
                "parent": [None],
                "parent_ref": [None],
                "group_refs": [None],
                "group_names": [None],
                "uuid": [str(uuid.uuid4())],
                "opening_date": [None],
                "closed_date": [None],
            }
        )
        country_gdf = gpd.GeoDataFrame(country_df[iaso_columns], geometry="geography", crs="EPSG:4326")
        country_gdf.to_file(output_path, driver="GPKG", layer="level-0-Country", crs="EPSG:4326")
        self.stdout.write(f"Written {len(country_gdf)} country feature")

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
                "parent": ["Niger"] * len(region_names),  # Parent is the country
                "parent_ref": ["NER"] * len(region_names),
                "group_refs": [None] * len(region_names),
                "group_names": [None] * len(region_names),
                "uuid": [str(uuid.uuid4()) for _ in range(len(region_names))],
                "opening_date": [None] * len(region_names),
                "closed_date": [None] * len(region_names),
            }
        )
        region_gdf = gpd.GeoDataFrame(region_df[iaso_columns], geometry="geography", crs="EPSG:4326")
        region_gdf.to_file(output_path, driver="GPKG", layer="level-1-Region", crs="EPSG:4326")
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

        # Initialize empty group columns (no groups in our data)
        iaso_df["group_refs"] = None
        iaso_df["group_names"] = None

        # Generate UUIDs for each org unit
        iaso_df["uuid"] = [str(uuid.uuid4()) for _ in range(len(gdf))]

        # Set opening/closing dates if available from pyramid data
        if "OPENING_DATE" in gdf.columns:
            iaso_df["opening_date"] = gdf["OPENING_DATE"].astype(str).replace("NaT", None)
        else:
            iaso_df["opening_date"] = None

        if "CLOSED_DATE" in gdf.columns:
            iaso_df["closed_date"] = gdf["CLOSED_DATE"].astype(str).replace("NaT", None)
        else:
            iaso_df["closed_date"] = None

        # Keep only the columns that IASO expects and set geometry
        iaso_gdf = gpd.GeoDataFrame(iaso_df[iaso_columns], geometry="geography", crs="EPSG:4326")

        # Remove any rows with null geometry
        iaso_gdf = iaso_gdf[iaso_gdf["geography"].notna()]

        self.stdout.write(f"Writing {len(iaso_gdf)} district features")

        # Write to GeoPackage following IASO format
        iaso_gdf.to_file(output_path, driver="GPKG", layer="level-2-District", crs="EPSG:4326")
