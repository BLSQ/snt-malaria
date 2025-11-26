-- 1. Load table that maps admin_2_name to org_unit_id
-- Copy From CSV: org_unit_to_admin_2_mapping
COPY org_unit_to_admin_2_mapping (admin_2_name, state, population)
FROM '/docker-entrypoint-initdb.d/04_org_unit_to_admin_2_mapping.csv'
-- FROM 'C:\working\folder\path\04_org_unit_to_admin_2_mapping.csv'
-- FROM 'https://dsmsntdataload.blob.core.windows.net/sntdata/04_org_unit_to_admin_2_mapping.csv'
DELIMITER ','
CSV HEADER
QUOTE '"'
ESCAPE '''';

-- Copy From CSV: model_output_temp_table
-- loading the data into a temp table without indexes should speed up initial loading
-- this temp table will be used to map org_unit_to_admin_2_mapping id,
-- since the file contains places rather than the id

-- Execute in test database only
-- \c test

DO $$
DECLARE
	file_name text;
	file_names text[] := ARRAY[
		'interventions01.csv',
		'interventions02.csv',
		'interventions03.csv',
		'interventions04.csv',
		'interventions05.csv',
		'interventions06.csv',
		'interventions07.csv'
	 ];
	query text;
	result text;

BEGIN
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

	-- Loads storage extension to fetch data from Azure Storage Blobs
	-- CREATE EXTENSION IF NOT EXISTS azure_storage;

	-- Update FROM statements below to load from Azure Storage Blobs if needed
	-- FROM 'https://dsmsntdataload.blob.core.windows.net/sntdata/interventions01.csv'

	-- Process files
	FOREACH file_name IN ARRAY file_names
	LOOP
		query := format(
			'COPY model_output_temp_table (
			admin_2_name, year, age_group,
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
			prevalence, prevalence_lower, prevalence_higher)
			FROM ''/docker-entrypoint-initdb.d/%s''
			DELIMITER '',''
			CSV HEADER
			QUOTE ''"''
			ESCAPE '''''''';',
			file_name
		);
		EXECUTE query;
		GET DIAGNOSTICS result = ROW_COUNT;
		RAISE NOTICE 'Processed %: % rows copied', file_name, result;
	END LOOP;

	CREATE INDEX IF NOT EXISTS model_output_admin_temp_table_info_idx
		ON model_output_temp_table (admin_2_name);

	RAISE NOTICE 'Admin info mapping';
	-- map admin_2_name from org_unit_to_admin_2_mapping table
	insert into model_output
	(org_unit_to_admin_2_mapping, year, age_group,
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
	prevalence, prevalence_lower, prevalence_higher)
	select
	ou_mapping.id org_unit_to_admin_2_mapping,
	temp.year,
	temp.age_group,
	temp.cm,
	temp.cm_coverage,
	temp.cm_subsidy,
	temp.cm_subsidy_coverage,
	temp.smc,
	temp.smc_coverage,
	temp.itn_c,
	temp.itn_c_coverage,
	temp.itn_r,
	temp.itn_r_coverage,
	temp.irs,
	temp.irs_coverage,
	temp.vacc,
	temp.vacc_coverage,
	temp.iptp,
	temp.iptp_coverage,
	temp.lsm,
	temp.lsm_coverage,
	temp.clinical_incidence,
	temp.clinical_incidence_lower,
	temp.clinical_incidence_higher,
	temp.severe_incidence,
	temp.severe_incidence_lower,
	temp.severe_incidence_higher,
	temp.prevalence,
	temp.prevalence_lower,
	temp.prevalence_higher
	from model_output_temp_table temp
	left join org_unit_to_admin_2_mapping ou_mapping
	on temp.admin_2_name = ou_mapping.admin_2_name;

	RAISE NOTICE 'create index model_output id';
	-- Index: model_output_org_unit_to_admin_2_mapping_idx
	CREATE INDEX IF NOT EXISTS model_output_org_unit_to_admin_2_mapping_idx
		ON model_output (org_unit_to_admin_2_mapping);

	-- Index: model_output_intervention_idx
	CREATE INDEX IF NOT EXISTS model_output_intervention_idx
		ON model_output (cm, cm_subsidy, smc, itn_c, itn_r, irs, vacc, iptp, lsm);

	-- Index: model_output_coverage_idx
	CREATE INDEX IF NOT EXISTS model_output_coverage_idx
    	ON model_output (cm_coverage, cm_subsidy_coverage, smc_coverage, itn_c_coverage, itn_r_coverage, irs_coverage, vacc_coverage, iptp_coverage, lsm_coverage);

	RAISE NOTICE 'drop model output temp table';
	DROP TABLE IF EXISTS model_output_temp_table;
	DROP INDEX IF EXISTS model_output_admin_temp_table_info_idx;

END $$;
