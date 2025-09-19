from django.contrib.auth.models import User
from django.db import models

from plugins.snt_malaria.models.intervention import Intervention


class CostBreakdownLineCategory(models.Model):
    class Meta:
        app_label = "snt_malaria"

    account = models.ForeignKey("iaso.Account", on_delete=models.CASCADE)
    name = models.TextField(max_length=255, blank=False)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="cost_breakdown_line_category_created_set"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="cost_breakdown_line_category_updated_set"
    )
    updated_at = models.DateTimeField(auto_now=True)


class CostBreakdownLine(models.Model):
    class Meta:
        app_label = "snt_malaria"

    intervention = models.ForeignKey(Intervention, on_delete=models.CASCADE)
    name = models.TextField(max_length=255, blank=False)
    category = models.ForeignKey(CostBreakdownLineCategory, on_delete=models.PROTECT)
    cost = models.FloatField()

    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="cost_breakdown_line_created_set"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="cost_breakdown_line_updated_set"
    )
    updated_at = models.DateTimeField(auto_now=True)
