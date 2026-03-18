"""OpenHEXA pipeline that creates the impact_data table (if needed) and loads a SwissTPH CSV."""

import sys

from pathlib import Path

import pandas as pd

from openhexa.sdk import current_run, parameter, pipeline, workspace  # type: ignore[import-unresolved]
from openhexa.sdk.files import File  # type: ignore[import-unresolved]
from sqlalchemy import create_engine, text
from sqlalchemy.types import Boolean


SCHEMA_SQL_PATH = Path(__file__).resolve().parent / "impact_data_schema.sql"

READ_CHUNK_SIZE = 50_000
WRITE_CHUNK_SIZE = 1_000

BOOLEAN_COLUMNS = [
    "deployed_int_IPTSc",
    "deployed_int_IRS",
    "deployed_int_SMC",
    "deployed_int_PMC",
    "deployed_int_Vaccine",
    "deployed_int_PBO",
    "deployed_int_IG2",
    "deployed_int_ITN",
    "deployed_int_iCCM",
    "deployed_int_LSM",
    "deployed_int_CM",
]


@pipeline("load-swisstph-csv", name="Load SwissTPH CSV to DB")
@parameter("csv_file", name="CSV file", type=File, help="CSV or ZIP file containing SwissTPH impact data")
@parameter(
    "recreate_table",
    name="Drop & recreate table",
    type=bool,
    default=True,
    help="Drop the existing table and recreate it from the schema before loading",
)
def load_swisstph_csv(csv_file: File, recreate_table: bool):
    ensure_schema(recreate_table)
    load_csv(csv_file)


@load_swisstph_csv.task
def ensure_schema(recreate: bool):
    """Create the impact_data table, optionally dropping it first."""
    schema_sql = SCHEMA_SQL_PATH.read_text()
    engine = create_engine(workspace.database_url)

    with engine.begin() as conn:
        if recreate:
            conn.execute(text("DROP TABLE IF EXISTS impact_data;"))
            current_run.log_info("Dropped existing impact_data table.")
        conn.execute(text(schema_sql))

    current_run.log_info("Schema ensured.")


@load_swisstph_csv.task
def load_csv(csv_file: File):
    path = csv_file.path
    current_run.log_info(f"Loading data from {path}...")

    engine = create_engine(workspace.database_url)

    dtype_mapping = {col: Boolean for col in BOOLEAN_COLUMNS}

    total_rows = 0
    for i, chunk in enumerate(pd.read_csv(path, chunksize=READ_CHUNK_SIZE)):
        chunk = _transform(chunk)
        present_dtypes = {c: dtype_mapping[c] for c in BOOLEAN_COLUMNS if c in chunk.columns}

        chunk.to_sql(
            "impact_data",
            if_exists="append",
            index=False,
            con=engine,
            chunksize=WRITE_CHUNK_SIZE,
            method="multi",
            dtype=present_dtypes,
        )
        total_rows += len(chunk)
        current_run.log_info(f"Chunk {i + 1}: {len(chunk)} rows ({total_rows} total)")

    current_run.add_database_output("impact_data")
    current_run.log_info(f"Load complete. {total_rows} total rows.")


def _transform(df):
    drop_cols = [c for c in df.columns if c.startswith("active_int_") or c.endswith("NoCM")]
    if drop_cols:
        df = df.drop(columns=drop_cols)

    present_bool_cols = [c for c in BOOLEAN_COLUMNS if c in df.columns]
    for col in present_bool_cols:
        df[col] = (
            pd.to_numeric(df[col].map({"TRUE": 1, "FALSE": 0, True: 1, False: 0}), errors="coerce")
            .fillna(0)
            .astype(int)
            .astype(bool)
        )

    return df


if __name__ == "__main__":
    if len(sys.argv) > 1:
        sys.argv = [sys.argv[0]]
    load_swisstph_csv()
