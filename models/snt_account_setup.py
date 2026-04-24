import os

from django.conf import settings
from django.db import models
from django.utils import timezone
from django_countries.fields import CountryField

from iaso.models import Account


def account_setup_file_upload_to(account_setup: "SNTAccountSetup", filename: str):
    today = timezone.now().date()
    year_month = today.strftime("%Y_%m")

    return os.path.join(
        "snt_account_setups",
        year_month,
        filename,
    )


class SNTAccountSetup(models.Model):
    # raw data from payload
    username = models.CharField(max_length=200, blank=False)
    country = CountryField()
    language = models.CharField(max_length=200, blank=False, choices=settings.LANGUAGES, default="en")
    geo_json_file = models.FileField(upload_to=account_setup_file_upload_to)

    # data after processing
    account = models.OneToOneField(
        Account, on_delete=models.CASCADE, null=True, blank=True, related_name="snt_account_setup"
    )
    gpkg_file = models.FileField(upload_to=account_setup_file_upload_to, null=True, blank=True)

    # metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
