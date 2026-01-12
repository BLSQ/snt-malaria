from django.contrib.auth.models import User
from django.db import models

from iaso.utils.models.soft_deletable import (
    DefaultSoftDeletableManager,
    SoftDeletableModel,
)


class Scenario(SoftDeletableModel):
    class Meta:
        app_label = "snt_malaria"
        ordering = ["-updated_at"]
        unique_together = [["account", "name"]]
        constraints = [
            models.CheckConstraint(
                check=models.Q(start_year__lte=models.F("end_year")),
                name="%(app_label)s_%(class)s_start_year_lte_end_year",
            )
        ]

    account = models.ForeignKey("iaso.Account", on_delete=models.CASCADE)
    created_by = models.ForeignKey(User, on_delete=models.PROTECT)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    start_year = models.IntegerField(blank=False, null=False)
    end_year = models.IntegerField(blank=False, null=False)
    is_locked = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = DefaultSoftDeletableManager()

    def __str__(self):
        return "%s %s %s" % (self.name, self.updated_at, self.id)
