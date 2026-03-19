from django.db import models

from iaso.utils.models.encrypted_text_field import EncryptedTextField


class ImpactProviderConfig(models.Model):
    class Meta:
        app_label = "snt_malaria"
        verbose_name = "Impact provider configuration"
        verbose_name_plural = "Impact provider configurations"

    class ProviderKey(models.TextChoices):
        SWISSTPH = "swisstph", "SwissTPH"
        SWISSTPH_CMR = "swisstph_cmr", "SwissTPH CMR"
        IDM = "idm", "IDM"

    account = models.OneToOneField(
        "iaso.Account",
        on_delete=models.CASCADE,
        related_name="impact_provider_config",
    )
    provider_key = models.CharField(
        max_length=50,
        choices=ProviderKey.choices,
        help_text="The impact data provider to use for this account.",
    )
    config = models.JSONField(
        default=dict,
        blank=True,
        help_text=(
            "Provider-specific configuration (non-secret). "
            "For database providers: {db_name, db_host, db_port, db_username}."
        ),
    )
    secret = EncryptedTextField(
        blank=True,
        default="",
        help_text=("Provider secret (password, token, API key). For database providers this is the database password."),
    )

    def __str__(self):
        return f"{self.account.name} - {self.get_provider_key_display()}"
