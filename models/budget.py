from django.contrib.auth.models import User
from django.db import models

from iaso.utils.models.soft_deletable import SoftDeletableModel
from plugins.snt_malaria.models.scenario import Scenario


class Budget(SoftDeletableModel):
    class Meta:
        app_label = "snt_malaria"
        ordering = ["-updated_at"]

    scenario = models.ForeignKey(Scenario, on_delete=models.CASCADE)
    name = models.TextField()
    cost_input = models.JSONField()
    population_input = models.JSONField()
    assumptions = models.JSONField()
    results = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="budget_created_set")
    # TODO: Not sure we will need this, but I'd rather have them already.
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="budget_edited_set")
