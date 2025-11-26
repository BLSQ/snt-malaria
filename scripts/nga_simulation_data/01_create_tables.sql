-- Table: org_unit_to_admin_2_mapping
CREATE TABLE IF NOT EXISTS org_unit_to_admin_2_mapping
(
    id integer,
    admin_2_name character varying(50),
    CONSTRAINT org_unit_to_admin_2_mapping_pkey PRIMARY KEY (id)
);

-- Table: model_output_temp_table -- Will be used for mapping
CREATE TABLE IF NOT EXISTS model_output_temp_table
(
    id integer NOT NULL GENERATED ALWAYS AS IDENTITY ( INCREMENT 1 ),
    admin_2_name character varying(50),
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
    clinical_incidence numeric(15,9), -- aka clinical_case
    clinical_incidence_lower numeric(15,9),
    clinical_incidence_higher numeric(15,9),
    severe_incidence numeric(15,9), -- aka severe_case
    severe_incidence_lower numeric(15,9),
    severe_incidence_higher numeric(15,9),
    prevalence numeric(15,9),
    prevalence_lower numeric(15,9),
    prevalence_higher numeric(15,9)
);

-- Table: model_output
CREATE TABLE IF NOT EXISTS model_output
(
    id integer NOT NULL GENERATED ALWAYS AS IDENTITY ( INCREMENT 1 ),
    org_unit_id smallint,
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
    clinical_incidence numeric(15,9), -- aka clinical_case
    clinical_incidence_lower numeric(15,9),
    clinical_incidence_higher numeric(15,9),
    severe_incidence numeric(15,9), -- aka severe_case
    severe_incidence_lower numeric(15,9),
    severe_incidence_higher numeric(15,9),
    prevalence numeric(15,9),
    prevalence_lower numeric(15,9),
    prevalence_higher numeric(15,9),
    CONSTRAINT model_output_org_unit_to_admin_2_mapping_fkey FOREIGN KEY (org_unit_id)
        REFERENCES org_unit_to_admin_2_mapping (id),
    CONSTRAINT model_output_age_group_fkey FOREIGN KEY (age_group)
        REFERENCES age_group (id),
    CONSTRAINT model_output_cm_coverage_fkey FOREIGN KEY (cm_coverage)
        REFERENCES coverage (id),
    CONSTRAINT model_output_cm_fkey FOREIGN KEY (cm)
        REFERENCES intervention_package (id),
    CONSTRAINT model_output_irs_coverage_fkey FOREIGN KEY (irs_coverage)
        REFERENCES coverage (id),
    CONSTRAINT model_output_irs_fkey FOREIGN KEY (irs)
        REFERENCES intervention_package (id),
    CONSTRAINT model_output_itn_c_coverage_fkey FOREIGN KEY (itn_c_coverage)
        REFERENCES coverage (id),
    CONSTRAINT model_output_itn_c_fkey FOREIGN KEY (itn_c)
        REFERENCES intervention_package (id),
    CONSTRAINT model_output_itn_r_coverage_fkey FOREIGN KEY (itn_r_coverage)
        REFERENCES coverage (id),
    CONSTRAINT model_output_itn_r_fkey FOREIGN KEY (itn_r)
        REFERENCES intervention_package (id),
    CONSTRAINT model_output_smc_coverage_fkey FOREIGN KEY (smc_coverage)
        REFERENCES coverage (id),
    CONSTRAINT model_output_smc_fkey FOREIGN KEY (smc)
        REFERENCES intervention_package (id),
    CONSTRAINT model_output_vacc_coverage_fkey FOREIGN KEY (vacc_coverage)
        REFERENCES coverage (id),
    CONSTRAINT model_output_vacc_fkey FOREIGN KEY (vacc)
        REFERENCES intervention_package (id),
    CONSTRAINT model_output_cm_subsidy_coverage_fkey FOREIGN KEY (cm_subsidy_coverage)
        REFERENCES coverage (id),
    CONSTRAINT model_output_cm_subsidy_fkey FOREIGN KEY (cm_subsidy)
        REFERENCES intervention_package (id),
    CONSTRAINT model_output_iptp_coverage_fkey FOREIGN KEY (iptp_coverage)
        REFERENCES coverage (id),
    CONSTRAINT model_output_iptp_fkey FOREIGN KEY (iptp)
        REFERENCES intervention_package (id),
    CONSTRAINT model_output_lsm_coverage_fkey FOREIGN KEY (lsm_coverage)
        REFERENCES coverage (id),
    CONSTRAINT model_output_lsm_fkey FOREIGN KEY (lsm)
        REFERENCES intervention_package (id)
) PARTITION BY RANGE (org_unit_id);

-- MODEL_OUTPUT indexing adjusted after data load

-- -- Index: model_output_org_unit_to_admin_2_mapping_idx
-- CREATE INDEX IF NOT EXISTS model_output_org_unit_to_admin_2_mapping_idx
--     ON model_output (org_unit_id);

-- -- Index: model_output_intervention_idx
-- CREATE INDEX IF NOT EXISTS model_output_intervention_idx
--     ON model_output (cm, smc, itn_c, itn_r, irs, vacc);

-- -- Index: model_output_coverage_idx
-- CREATE INDEX IF NOT EXISTS model_output_coverage_idx
--     ON model_output (cm_coverage, smc_coverage, itn_c_coverage, itn_r_coverage, irs_coverage, vacc_coverage);

-- Partitions: model_output_a_e, model_output_f_j, model_output_k_o, model_output_p_z
-- Place count: A-E-> 217, F-J-> 175, K-O-> 248, P-Z-> 134
-- Partition was changed to be in range instead of list of letter

CREATE TABLE model_output_200 PARTITION OF model_output
(
    CONSTRAINT model_output_200_pkey PRIMARY KEY (id)
)
    FOR VALUES FROM (1) TO (200);

CREATE TABLE model_output_400 PARTITION OF model_output
(
    CONSTRAINT model_output_400_pkey PRIMARY KEY (id)
)
    FOR VALUES FROM (200) TO (400);

CREATE TABLE model_output_600 PARTITION OF model_output
(
    CONSTRAINT model_output_600_pkey PRIMARY KEY (id)
)
    FOR VALUES FROM (400) TO (600);

CREATE TABLE model_output_max PARTITION OF model_output
(
    CONSTRAINT model_output_max_pkey PRIMARY KEY (id)
)
    FOR VALUES FROM (600) TO (MAXVALUE);
