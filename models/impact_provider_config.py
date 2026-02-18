from django.db import models


class ImpactProviderConfig(models.Model):
    class Meta:
        app_label = "snt_malaria"
        verbose_name = "Impact provider configuration"
        verbose_name_plural = "Impact provider configurations"

    PROVIDER_CHOICES = [
        ("swisstph", "SwissTPH"),
        ("idm", "IDM"),
    ]

    account = models.OneToOneField(
        "iaso.Account",
        on_delete=models.CASCADE,
        related_name="impact_provider_config",
    )
    provider_key = models.CharField(
        max_length=50,
        choices=PROVIDER_CHOICES,
        help_text="The impact data provider to use for this account.",
    )

    def __str__(self):
        return f"{self.account.name} - {self.get_provider_key_display()}"
