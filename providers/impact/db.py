import threading

from django.db import connections
from django.db.backends.postgresql.base import DatabaseWrapper

from plugins.snt_malaria.providers.impact.base import IncompleteConfigError


_lock = threading.Lock()
_db_configs: dict[str, dict] = {}

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
        "CONN_HEALTH_CHECKS": False,
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

    Creates a ``DatabaseWrapper`` and injects it directly into Django's
    per-thread connection storage.  The connection is **not** added to
    ``connections.settings`` so it stays invisible to ``connections.all()``
    and third-party middleware (e.g. ``querycount``) that iterates all
    known connections.

    The wrapper is read-only (``default_transaction_read_only=on``).

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

    alias = f"impact_provider_{config_id}"

    with _lock:
        if alias not in _db_configs:
            _db_configs[alias] = _build_db_config(config, secret)

    # The per-thread Local may not have this alias yet (new thread, or
    # cleared by Django's request_finished signal).  Re-create if needed.
    if not hasattr(connections._connections, alias):
        wrapper = DatabaseWrapper(_db_configs[alias], alias=alias)
        connections[alias] = wrapper

    return alias
