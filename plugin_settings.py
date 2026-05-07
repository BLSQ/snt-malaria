import os


INSTALLED_APPS = ["plugins.snt_malaria"]
CONSTANTS = {
    "LOGO_PATH": "",
    "APP_TITLE": "SNT Malaria",
    "HIDE_BASIC_NAV_ITEMS": "yes",
    "ENABLE_PUBLIC_ACCOUNT_SETUP": os.environ.get("ENABLE_PUBLIC_ACCOUNT_SETUP", "false").lower() == "true",
}
DEFAULT_THROTTLE_RATES = {
    "snt_public_account": os.environ.get("PUBLIC_ACCOUNT_THROTTLE_RATE", "5/hour"),
}
