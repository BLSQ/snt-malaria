from django.db import models

from plugins.snt_malaria.models.scenario import Scenario


class BudgetAssumptions(models.Model):
    class Meta:
        app_label = "snt_malaria"
        unique_together = [["scenario", "intervention_code"]]

    scenario = models.ForeignKey(Scenario, on_delete=models.CASCADE, related_name="scenario")
    # ideally this should be an intervention FK, but this model interacts with the budget calculator, which has
    # a different intervention list, so codes are reused by multiple interventions.
    # currently, the frontend prevents assumptions from being created with the same code, but this is currently possible
    # here at the model level
    # TODO: make it an enum instead
    intervention_code = models.CharField(max_length=100)
    divisor = models.DecimalField(max_digits=3, decimal_places=2)
    bale_size = models.IntegerField()
    buffer_mult = models.DecimalField(max_digits=3, decimal_places=2)
    coverage = models.DecimalField(max_digits=3, decimal_places=2)
    doses_per_pw = models.IntegerField()
    age_string = models.CharField()
    pop_prop_3_11 = models.DecimalField(max_digits=3, decimal_places=2)
    pop_prop_12_59 = models.DecimalField(max_digits=3, decimal_places=2)
    monthly_rounds = models.IntegerField()
    touchpoints = models.IntegerField()
    tablet_factor = models.DecimalField(max_digits=3, decimal_places=2)
    doses_per_child = models.IntegerField()
