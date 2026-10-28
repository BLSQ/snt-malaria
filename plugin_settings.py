import os


INSTALLED_APPS = ["plugins.snt_malaria"]
CONSTANTS = {
    "LOGO_PATH": "",
    "APP_TITLE": "SNT Malaria",
    "HIDE_BASIC_NAV_ITEMS": "yes",
    # Keep in sync with primaryMain in js/src/constants/theme.ts: Django auth pages can't read the JS theme.
    "THEME_PRIMARY_COLOR": "#673AB7",
    "ENABLE_PUBLIC_ACCOUNT_SETUP": os.environ.get("ENABLE_PUBLIC_ACCOUNT_SETUP", "false").lower() == "true",
    # Paths that IasoLogoutView accepts as ?next=... after logging the user out.
    # Used by the configureAccount wizard's "Restart" link.
    "LOGOUT_NEXT_ALLOWED_PATHS": ["/snt_malaria/public/setupAccount"],
    "COMPOSITE_LAYER_AI_MODEL": os.environ.get("COMPOSITE_LAYER_AI_MODEL", "claude-opus-4-7"),
    "SCENARIO_RULE_AI_MODEL": os.environ.get("SCENARIO_RULE_AI_MODEL", "claude-opus-4-7"),
}
DEFAULT_THROTTLE_RATES = {
    "snt_public_account": os.environ.get("PUBLIC_ACCOUNT_THROTTLE_RATE", "5/hour"),
}
