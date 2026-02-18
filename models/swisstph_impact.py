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
    EIR = models.FloatField(null=True, blank=True)
    year = models.BigIntegerField(null=True, blank=True)
    age_group = models.TextField(null=True, blank=True)
    prevalenceRate = models.FloatField(null=True, blank=True)
    incidenceRate = models.FloatField(null=True, blank=True)
    nHost = models.FloatField(null=True, blank=True)
    nSevere = models.FloatField(null=True, blank=True)
    nUncomp = models.FloatField(null=True, blank=True)
    tSevere = models.FloatField(null=True, blank=True)
    tUncomp = models.FloatField(null=True, blank=True)
    expectedDirectDeaths = models.FloatField(null=True, blank=True)

    deployed_int_IPTSc = models.BooleanField(null=True, blank=True)
    deployed_int_IRS = models.BooleanField(null=True, blank=True)
    deployed_int_SMC = models.BooleanField(null=True, blank=True)
    deployed_int_PMC = models.BooleanField(null=True, blank=True)
    deployed_int_Vaccine = models.BooleanField(null=True, blank=True)
    deployed_int_PBO = models.BooleanField(null=True, blank=True)
    deployed_int_IG2 = models.BooleanField(null=True, blank=True)
    deployed_int_ITN = models.BooleanField(null=True, blank=True)
    deployed_int_iCCM = models.BooleanField(null=True, blank=True)

    plan = models.TextField(null=True, blank=True)
    risk_stratum = models.TextField(null=True, blank=True)

    coverage_int_IPTSc = models.FloatField(null=True, blank=True)
    coverage_int_IRS = models.FloatField(null=True, blank=True)
    coverage_int_SMC = models.FloatField(null=True, blank=True)
    coverage_int_PMC = models.FloatField(null=True, blank=True)
    coverage_int_Vaccine = models.FloatField(null=True, blank=True)
    coverage_int_PBO = models.FloatField(null=True, blank=True)
    coverage_int_IG2 = models.FloatField(null=True, blank=True)
    coverage_int_ITN = models.FloatField(null=True, blank=True)
    coverage_int_iCCM = models.FloatField(null=True, blank=True)

    cum_nUncomp = models.FloatField(null=True, blank=True)
    cum_tUncomp = models.FloatField(null=True, blank=True)
    cum_nSevere = models.FloatField(null=True, blank=True)
    cum_tSevere = models.FloatField(null=True, blank=True)
    cum_expectedDirectDeaths = models.FloatField(null=True, blank=True)

    @property
    def number_cases(self):
        return self.nUncomp

    @property
    def number_severe_cases(self):
        return self.nSevere
