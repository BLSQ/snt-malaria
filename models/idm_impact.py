from django.db import models


class IdmAdminInfo(models.Model):
    """Geographic administrative units (LGAs) with population data in the IDM database."""

    class Meta:
        app_label = "snt_malaria"
        managed = False
        db_table = "admin_info"

    id = models.AutoField(primary_key=True)
    admin_2_name = models.CharField(max_length=255, null=True, blank=True)
    state = models.CharField(max_length=255, null=True, blank=True)
    population = models.IntegerField(null=True, blank=True)

    def __str__(self):
        return f"{self.admin_2_name} ({self.state})"


class IdmInterventionPackage(models.Model):
    """Available intervention types in the IDM database."""

    class Meta:
        app_label = "snt_malaria"
        managed = False
        db_table = "intervention_package"

    id = models.IntegerField(primary_key=True)
    option = models.CharField(max_length=255, null=True, blank=True)
    type = models.CharField(max_length=255, null=True, blank=True)
    description = models.CharField(max_length=255, null=True, blank=True)

    def __str__(self):
        return f"{self.option} ({self.id})"


class IdmCoverage(models.Model):
    """Coverage level options in the IDM database."""

    class Meta:
        app_label = "snt_malaria"
        managed = False
        db_table = "coverage"

    id = models.IntegerField(primary_key=True)
    option = models.CharField(max_length=255, null=True, blank=True)
    key = models.CharField(max_length=255, null=True, blank=True)
    description = models.CharField(max_length=255, null=True, blank=True)

    def __str__(self):
        return f"{self.option} ({self.id})"


class IdmAgeGroup(models.Model):
    """Age group demographics in the IDM database."""

    class Meta:
        app_label = "snt_malaria"
        managed = False
        db_table = "age_group"

    id = models.IntegerField(primary_key=True)
    option = models.CharField(max_length=255, null=True, blank=True)

    def __str__(self):
        return f"{self.option} ({self.id})"


class IdmModelOutput(models.Model):
    """Main epidemiological simulation results from the IDM database.

    Each row represents simulation output for a specific admin unit, year,
    age group, and combination of interventions with their coverage levels.
    """

    class Meta:
        app_label = "snt_malaria"
        managed = False
        db_table = "model_output"

    id = models.AutoField(primary_key=True)

    # Admin info FK
    admin_info_ref = models.ForeignKey(
        IdmAdminInfo,
        on_delete=models.DO_NOTHING,
        db_column="admin_info",
        null=True,
        blank=True,
    )

    year = models.SmallIntegerField(null=True, blank=True)

    # Age group FK
    age_group_ref = models.ForeignKey(
        IdmAgeGroup,
        on_delete=models.DO_NOTHING,
        db_column="age_group",
        null=True,
        blank=True,
    )

    # Intervention columns (FK to intervention_package)
    cm = models.SmallIntegerField(null=True, blank=True)
    cm_coverage = models.SmallIntegerField(null=True, blank=True)
    cm_subsidy = models.SmallIntegerField(null=True, blank=True)
    cm_subsidy_coverage = models.SmallIntegerField(null=True, blank=True)
    smc = models.SmallIntegerField(null=True, blank=True)
    smc_coverage = models.SmallIntegerField(null=True, blank=True)
    itn_c = models.SmallIntegerField(null=True, blank=True)
    itn_c_coverage = models.SmallIntegerField(null=True, blank=True)
    itn_r = models.SmallIntegerField(null=True, blank=True)
    itn_r_coverage = models.SmallIntegerField(null=True, blank=True)
    irs = models.SmallIntegerField(null=True, blank=True)
    irs_coverage = models.SmallIntegerField(null=True, blank=True)
    vacc = models.SmallIntegerField(null=True, blank=True)
    vacc_coverage = models.SmallIntegerField(null=True, blank=True)
    iptp = models.SmallIntegerField(null=True, blank=True)
    iptp_coverage = models.SmallIntegerField(null=True, blank=True)
    lsm = models.SmallIntegerField(null=True, blank=True)
    lsm_coverage = models.SmallIntegerField(null=True, blank=True)

    # Outcome metrics
    clinical_incidence = models.DecimalField(
        max_digits=20, decimal_places=10, null=True, blank=True
    )
    clinical_incidence_lower = models.DecimalField(
        max_digits=20, decimal_places=10, null=True, blank=True
    )
    clinical_incidence_higher = models.DecimalField(
        max_digits=20, decimal_places=10, null=True, blank=True
    )
    severe_incidence = models.DecimalField(
        max_digits=20, decimal_places=10, null=True, blank=True
    )
    severe_incidence_lower = models.DecimalField(
        max_digits=20, decimal_places=10, null=True, blank=True
    )
    severe_incidence_higher = models.DecimalField(
        max_digits=20, decimal_places=10, null=True, blank=True
    )
    prevalence = models.DecimalField(
        max_digits=20, decimal_places=10, null=True, blank=True
    )
    prevalence_lower = models.DecimalField(
        max_digits=20, decimal_places=10, null=True, blank=True
    )
    prevalence_higher = models.DecimalField(
        max_digits=20, decimal_places=10, null=True, blank=True
    )


