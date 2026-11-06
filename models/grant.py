from django.db import models


class Donor(models.Model):
    class Meta:
        app_label = "snt_malaria"
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(fields=["workspace", "name"], name="snt_malaria_donor_workspace_name_uniq"),
        ]

    workspace = models.ForeignKey("iaso.Workspace", on_delete=models.CASCADE, related_name="snt_donors")
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class Grant(models.Model):
    class Meta:
        app_label = "snt_malaria"
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(fields=["workspace", "name"], name="snt_malaria_grant_workspace_name_uniq"),
        ]

    workspace = models.ForeignKey("iaso.Workspace", on_delete=models.CASCADE, related_name="snt_grants")
    donor = models.ForeignKey(Donor, on_delete=models.PROTECT, related_name="grants")
    name = models.CharField(max_length=255)
    short_name = models.CharField(max_length=100, blank=True, default="")
    description = models.TextField(blank=True, default="")
    amount = models.DecimalField(max_digits=20, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
