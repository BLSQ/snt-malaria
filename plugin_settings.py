import os

INSTALLED_APPS = ["plugins.snt_malaria"]
CONSTANTS = {"LOGO_PATH": "", "APP_TITLE": "SNT Malaria", "HIDE_BASIC_NAV_ITEMS": "yes"}

DATABASES = {
    "impact_swisstph": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("IMPACT_DB_NAME"),
        "USER": os.environ.get("IMPACT_DB_USERNAME"),
        "PASSWORD": os.environ.get("IMPACT_DB_PASSWORD"),
        "HOST": os.environ.get("IMPACT_DB_HOST"),
        "PORT": os.environ.get("IMPACT_DB_PORT", 5432),
        "OPTIONS": {"options": "-c default_transaction_read_only=on"},
    },
}
