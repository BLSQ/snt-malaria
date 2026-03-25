from django.db import connections

from plugins.snt_malaria.providers.impact.base import IncompleteConfigError


REQUIRED_CONFIG_KEYS = {"db_name", "db_host"}


def _build_db_config(config: dict, secret: str) -> dict:
    return {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": config.get("db_name", ""),
        "USER": config.get("db_username", ""),
        "PASSWORD": secret or "",
        "HOST": config.get("db_host", ""),
        "PORT": config.get("db_port", 5432),
        "OPTIONS": {"options": "-c default_transaction_read_only=on"},
        "ATOMIC_REQUESTS": False,
        "AUTOCOMMIT": True,
        "CONN_MAX_AGE": 0,
        "CONN_HEALTH_CHECKS": True,
        "TIME_ZONE": None,
        "TEST": {
            "CHARSET": None,
            "COLLATION": None,
            "MIGRATE": True,
            "MIRROR": "default",
            "NAME": None,
        },
    }


def ensure_db_connection(config_id: int, config: dict, secret: str) -> str:
    """Register a dynamic Django database connection and return its alias.

    The connection is read-only (``default_transaction_read_only=on``)
    and is managed by Django's standard connection lifecycle.

    Raises IncompleteConfigError when required keys (db_name, db_host)
    are missing or empty in the config dict.
    """
    missing = {k for k in REQUIRED_CONFIG_KEYS if not config.get(k)}
    if missing:
        raise IncompleteConfigError(
            f"Impact provider config {config_id} is missing required database "
            f"settings: {', '.join(sorted(missing))}. "
            f"Fill in the config JSON via the Django admin."
        )

    alias = f"impact_{config_id}"

    if alias not in connections.databases:
        connections.databases[alias] = _build_db_config(config, secret)

    return alias
