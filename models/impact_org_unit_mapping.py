from django.db import models


class ImpactOrgUnitMapping(models.Model):
    class Meta:
        app_label = "snt_malaria"

    org_unit = models.OneToOneField(
        "iaso.OrgUnit",
        on_delete=models.CASCADE,
        related_name="impact_mapping",
    )
    reference = models.CharField(
        max_length=255,
        help_text="The reference string used to match this org unit in the external impact database.",
    )

    def __str__(self):
        return f"{self.org_unit} → {self.reference}"
