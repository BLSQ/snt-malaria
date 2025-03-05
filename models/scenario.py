from django.db import models
from django.contrib.auth.models import User

from iaso.utils.models.soft_deletable import (
    SoftDeletableModel,
)


class Scenario(SoftDeletableModel):
    class Meta:
        app_label = "snt_malaria"
        ordering = ["-updated_at"]
        unique_together = [["account", "name"]]

    account = models.ForeignKey("iaso.Account", on_delete=models.CASCADE)
    created_by = models.ForeignKey(User, on_delete=models.PROTECT)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return "%s %s %s" % (self.name, self.updated_at, self.id)
