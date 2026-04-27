"""OpenHEXA pipeline that loads IDM simulation data into the workspace database.

Ships with a hand-maintained schema (``idm_schema.sql``) that mirrors IDM's
authoritative schema. Every run drops and recreates the tables, then streams
the two provided CSVs in.

Tasks:

1. ``apply_schema``    - execute ``idm_schema.sql``: drop + recreate tables,
   seed the static reference rows (``age_group``, ``coverage``,
   ``intervention_package``).
2. ``load_admin_info`` - stream the admin_info CSV directly into ``admin_info``.
3. ``load_simulation`` - stream the simulation CSV into a per-connection temp
   table, then ``INSERT ... SELECT ... LEFT JOIN admin_info`` to resolve
   ``admin_name`` -> ``admin_info.id``. All other FK columns are already
   integer ids in the CSV.

There is no auto-generation: the Django models in
``plugins/snt_malaria/models/idm_impact.py`` and ``idm_schema.sql`` are
maintained by hand. Update both together when IDM's upstream schema changes.
"""

import sys

from pathlib import Path

from openhexa.sdk import current_run, parameter, pipeline, workspace  # type: ignore[import-unresolved]
from openhexa.sdk.files import File  # type: ignore[import-unresolved]
from sqlalchemy import create_engine


SCHEMA_SQL_PATH = Path(__file__).resolve().parent / "idm_schema.sql"

ADMIN_INFO_COLUMNS = ("admin_2_name", "state", "population", "population_u5")


# Mirrors the column order of IDM's simulation_data.csv. The CSV header labels
# differ (``admin_name``, ``cm_id`` etc.) but ``COPY ... CSV HEADER`` is
# positional, so we use the destination column names here.
#
# Regular (non-TEMP) table: the OpenHEXA workspace role lacks CREATE TEMP TABLE
# privilege. We drop it manually at the start and end of load_simulation to keep
# it self-contained.
SIMULATION_TEMP_DDL = """
DROP TABLE IF EXISTS model_output_temp;
CREATE TABLE model_output_temp (
    admin_2_name varchar(50),
    year smallint,
    age_group smallint,
    cm smallint,
    cm_coverage smallint,
    cm_subsidy smallint,
    cm_subsidy_coverage smallint,
    smc smallint,
    smc_coverage smallint,
    itn_c smallint,
    itn_c_coverage smallint,
    itn_r smallint,
    itn_r_coverage smallint,
    irs smallint,
    irs_coverage smallint,
    vacc smallint,
    vacc_coverage smallint,
    iptp smallint,
    iptp_coverage smallint,
    lsm smallint,
    lsm_coverage smallint,
    clinical_incidence numeric(20, 10),
    clinical_incidence_lower numeric(20, 10),
    clinical_incidence_higher numeric(20, 10),
    severe_incidence numeric(20, 10),
    severe_incidence_lower numeric(20, 10),
    severe_incidence_higher numeric(20, 10),
    prevalence numeric(20, 10),
    prevalence_lower numeric(20, 10),
    prevalence_higher numeric(20, 10)
)
"""

SIMULATION_INSERT_SQL = """
INSERT INTO model_output (
    admin_info, year, age_group,
    cm, cm_coverage,
    cm_subsidy, cm_subsidy_coverage,
    smc, smc_coverage,
    itn_c, itn_c_coverage,
    itn_r, itn_r_coverage,
    irs, irs_coverage,
    vacc, vacc_coverage,
    iptp, iptp_coverage,
    lsm, lsm_coverage,
    clinical_incidence, clinical_incidence_lower, clinical_incidence_higher,
    severe_incidence, severe_incidence_lower, severe_incidence_higher,
    prevalence, prevalence_lower, prevalence_higher
)
SELECT
    info.id,
    t.year, t.age_group,
    t.cm, t.cm_coverage,
    t.cm_subsidy, t.cm_subsidy_coverage,
    t.smc, t.smc_coverage,
    t.itn_c, t.itn_c_coverage,
    t.itn_r, t.itn_r_coverage,
    t.irs, t.irs_coverage,
    t.vacc, t.vacc_coverage,
    t.iptp, t.iptp_coverage,
    t.lsm, t.lsm_coverage,
    t.clinical_incidence, t.clinical_incidence_lower, t.clinical_incidence_higher,
    t.severe_incidence, t.severe_incidence_lower, t.severe_incidence_higher,
    t.prevalence, t.prevalence_lower, t.prevalence_higher
FROM model_output_temp t
LEFT JOIN admin_info info ON t.admin_2_name = info.admin_2_name
"""


@pipeline("load-idm-data", name="Load IDM Data", timeout=14400)
@parameter(
    "admin_info_csv",
    name="admin_info CSV",
    type=File,
    help="CSV with columns: admin_2_name, state, population, population_u5",
)
@parameter(
    "simulation_data_csv",
    name="simulation_data CSV",
    type=File,
    help="IDM simulation_data.csv (admin_name + year + age_group + 9 intervention/coverage ids + outcomes).",
)
def load_idm_data(admin_info_csv: File, simulation_data_csv: File):
    ready = apply_schema()
    admin_ready = load_admin_info(admin_info_csv, ready)
    load_simulation(simulation_data_csv, admin_ready)


@load_idm_data.task
def apply_schema() -> bool:
    """Drop + recreate all IDM tables from idm_schema.sql and seed fixtures."""
    schema_sql = SCHEMA_SQL_PATH.read_text()
    engine = create_engine(workspace.database_url)
    with engine.connect() as conn:
        raw = conn.connection.dbapi_connection
        with raw.cursor() as cur:
            cur.execute(schema_sql)
        raw.commit()
    current_run.log_info("Schema applied: tables recreated and reference rows seeded.")
    return True


@load_idm_data.task
def load_admin_info(admin_info_csv: File, _ready: bool) -> bool:
    """Stream the admin_info CSV directly into the admin_info table."""
    engine = create_engine(workspace.database_url)
    with engine.connect() as conn:
        rows = _copy_csv(conn, Path(admin_info_csv.path), "admin_info", ADMIN_INFO_COLUMNS)
    current_run.log_info(f"Loaded {rows} rows into admin_info.")
    return True


@load_idm_data.task
def load_simulation(simulation_data_csv: File, _ready: bool) -> bool:
    """Stream simulation CSV into a staging table, then INSERT...SELECT into model_output."""
    engine = create_engine(workspace.database_url)
    with engine.connect() as conn:
        raw = conn.connection.dbapi_connection
        with raw.cursor() as cur:
            cur.execute(SIMULATION_TEMP_DDL)
            with open(simulation_data_csv.path, encoding="utf-8") as f:
                cur.copy_expert(
                    "COPY model_output_temp FROM STDIN DELIMITER ',' CSV HEADER QUOTE '\"'",
                    f,
                )
            cur.execute("SELECT count(*) FROM model_output_temp")
            staged = cur.fetchone()[0]
            current_run.log_info(f"Staged {staged} simulation rows in staging table.")

            cur.execute(SIMULATION_INSERT_SQL)
            cur.execute("SELECT count(*) FROM model_output")
            final_rows = cur.fetchone()[0]
            cur.execute("DROP TABLE model_output_temp")
        raw.commit()

    current_run.log_info(f"Loaded {final_rows} rows into model_output.")
    current_run.add_database_output("model_output")
    return True


def _copy_csv(conn, csv_path: Path, table: str, columns: tuple[str, ...]) -> int:
    """Stream *csv_path* into *table*/*columns* via COPY FROM STDIN. Returns row count."""
    cols_clause = f"({', '.join(columns)})"
    raw = conn.connection.dbapi_connection
    with raw.cursor() as cur, open(csv_path, encoding="utf-8") as f:
        cur.copy_expert(
            f"COPY {table} {cols_clause} FROM STDIN DELIMITER ',' CSV HEADER QUOTE '\"'",
            f,
        )
    raw.commit()
    with raw.cursor() as cur:
        cur.execute(f"SELECT count(*) FROM {table}")
        return cur.fetchone()[0]


__all__ = ["load_idm_data"]


if __name__ == "__main__":
    if len(sys.argv) > 1:
        sys.argv = [sys.argv[0]]
    load_idm_data()
