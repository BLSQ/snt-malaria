from django.db import models

from iaso.utils.models.soft_deletable import SoftDeletableModel
from plugins.snt_malaria.models.intervention import Intervention
from plugins.snt_malaria.models.scenario import Scenario


class BudgetSettingsOverrides(SoftDeletableModel):
    class Meta:
        app_label = "snt_malaria"

    scenario = models.ForeignKey(Scenario, on_delete=models.CASCADE, related_name="scenario")
    intervention = models.OneToOneField(Intervention, on_delete=models.CASCADE, related_name="intervention")
    divisor = models.DecimalField(max_digits=3, decimal_places=2)
    bale_size = models.IntegerField()
    buffer_mult = models.DecimalField(max_digits=3, decimal_places=2)
    coverage = models.DecimalField(max_digits=3, decimal_places=2)
    doses_per_pw = models.IntegerField()
    age_string = models.CharField()
    pop_prop_3_11 = models.DecimalField(max_digits=20, decimal_places=10)
    pop_prop_12_59 = models.DecimalField(max_digits=20, decimal_places=10)
    monthly_rounds = models.IntegerField()
    touchpoints = models.DecimalField(max_digits=20, decimal_places=10)
    tablet_factor = models.DecimalField(max_digits=20, decimal_places=10)
    doses_per_child = models.IntegerField()
