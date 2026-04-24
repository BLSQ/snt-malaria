import os


INSTALLED_APPS = ["plugins.snt_malaria"]
CONSTANTS = {
    "LOGO_PATH": "",
    "APP_TITLE": "SNT Malaria",
    "HIDE_BASIC_NAV_ITEMS": "yes",
    "ENABLE_PUBLIC_ACCOUNT_SETUP": os.environ.get("ENABLE_PUBLIC_ACCOUNT_SETUP", "false").lower() == "true",
}
