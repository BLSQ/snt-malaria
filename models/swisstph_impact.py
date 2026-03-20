from django.db import models


class SwissTPHImpactData(models.Model):
    class Meta:
        app_label = "snt_malaria"
        managed = False
        db_table = "impact_data"

    impact_index = models.BigIntegerField(primary_key=True, db_column="index")

    admin_1 = models.TextField(null=True, blank=True)
    iso_code = models.TextField(null=True, blank=True)
    country = models.TextField(null=True, blank=True)
    scenario_name = models.TextField(null=True, blank=True)
    seed = models.BigIntegerField(null=True, blank=True)
    eir_ci = models.TextField(null=True, blank=True, db_column="EIR_CI")
    eir = models.FloatField(null=True, blank=True, db_column="EIR")
    year = models.BigIntegerField(null=True, blank=True)
    age_group = models.TextField(null=True, blank=True)
    prevalence_rate = models.FloatField(null=True, blank=True, db_column="prevalenceRate")
    incidence_rate = models.FloatField(null=True, blank=True, db_column="incidenceRate")
    n_host = models.FloatField(null=True, blank=True, db_column="nHost")
    n_severe = models.FloatField(null=True, blank=True, db_column="nSevere")
    n_uncomp = models.FloatField(null=True, blank=True, db_column="nUncomp")
    t_severe = models.FloatField(null=True, blank=True, db_column="tSevere")
    t_uncomp = models.FloatField(null=True, blank=True, db_column="tUncomp")
    expected_direct_deaths = models.FloatField(null=True, blank=True, db_column="expectedDirectDeaths")

    deployed_int_iptsc = models.BooleanField(null=True, blank=True, db_column="deployed_int_IPTSc")
    deployed_int_irs = models.BooleanField(null=True, blank=True, db_column="deployed_int_IRS")
    deployed_int_smc = models.BooleanField(null=True, blank=True, db_column="deployed_int_SMC")
    deployed_int_pmc = models.BooleanField(null=True, blank=True, db_column="deployed_int_PMC")
    deployed_int_vaccine = models.BooleanField(null=True, blank=True, db_column="deployed_int_Vaccine")
    deployed_int_pbo = models.BooleanField(null=True, blank=True, db_column="deployed_int_PBO")
    deployed_int_ig2 = models.BooleanField(null=True, blank=True, db_column="deployed_int_IG2")
    deployed_int_itn = models.BooleanField(null=True, blank=True, db_column="deployed_int_ITN")
    deployed_int_iccm = models.BooleanField(null=True, blank=True, db_column="deployed_int_iCCM")
    deployed_int_lsm = models.BooleanField(null=True, blank=True, db_column="deployed_int_LSM")
    deployed_int_cm = models.BooleanField(null=True, blank=True, db_column="deployed_int_CM")

    plan = models.TextField(null=True, blank=True)
    risk_stratum = models.TextField(null=True, blank=True)

    coverage_int_iptsc = models.FloatField(null=True, blank=True, db_column="coverage_int_IPTSc")
    coverage_int_irs = models.FloatField(null=True, blank=True, db_column="coverage_int_IRS")
    coverage_int_smc = models.FloatField(null=True, blank=True, db_column="coverage_int_SMC")
    coverage_int_pmc = models.FloatField(null=True, blank=True, db_column="coverage_int_PMC")
    coverage_int_vaccine = models.FloatField(null=True, blank=True, db_column="coverage_int_Vaccine")
    coverage_int_pbo = models.FloatField(null=True, blank=True, db_column="coverage_int_PBO")
    coverage_int_ig2 = models.FloatField(null=True, blank=True, db_column="coverage_int_IG2")
    coverage_int_itn = models.FloatField(null=True, blank=True, db_column="coverage_int_ITN")
    coverage_int_iccm = models.FloatField(null=True, blank=True, db_column="coverage_int_iCCM")
    coverage_int_cm = models.FloatField(null=True, blank=True, db_column="coverage_int_CM")
    coverage_int_lsm = models.FloatField(null=True, blank=True, db_column="coverage_int_LSM")

    cum_n_uncomp = models.FloatField(null=True, blank=True, db_column="cum_nUncomp")
    cum_t_uncomp = models.FloatField(null=True, blank=True, db_column="cum_tUncomp")
    cum_n_severe = models.FloatField(null=True, blank=True, db_column="cum_nSevere")
    cum_t_severe = models.FloatField(null=True, blank=True, db_column="cum_tSevere")
    cum_expected_direct_deaths = models.FloatField(null=True, blank=True, db_column="cum_expectedDirectDeaths")
