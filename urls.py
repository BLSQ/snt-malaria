"""
URL patterns for SNT Malaria plugin admin functionality.
"""

from django.urls import re_path

from .views import public_account_setup_spa


urlpatterns = [
    # Anonymous SPA mount for the public setupAccount flow (/snt_malaria/public/setupAccount/...).
    # Loads the React shell without @login_required when settings.ENABLE_PUBLIC_ACCOUNT_SETUP is True.
    # The account_setup API is gated the same way; this view keeps the SPA and API aligned.
    re_path(r"^public/.*$", public_account_setup_spa, name="snt_malaria_public"),
]
