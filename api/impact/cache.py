from __future__ import annotations


"""View-level cache for serialized impact API responses.

Entries are keyed by (scenario_id, scenario.updated_at, age_group,
year_from, year_to).  Including the scenario's updated_at timestamp
means the cache self-invalidates whenever assignments are refreshed
(which calls Scenario.save(), bumping updated_at).

The TTL is read from ImpactProviderConfig.cache_ttl_seconds.
Setting it to 0 disables caching entirely.
"""

from django.core.cache import cache

from plugins.snt_malaria.models import ImpactProviderConfig, Scenario


_KEY_PREFIX = "snt_impact"


def get_ttl(account) -> int:
    row = ImpactProviderConfig.objects.filter(account=account).values("cache_ttl_seconds").first()
    return row["cache_ttl_seconds"] if row else ImpactProviderConfig.DEFAULT_CACHE_TTL_SECONDS


def get(scenario_id, age_group, year_from, year_to) -> dict | None:
    key = _build_key(scenario_id, age_group, year_from, year_to)
    return cache.get(key) if key else None


def set(scenario_id, age_group, year_from, year_to, data, ttl) -> None:
    key = _build_key(scenario_id, age_group, year_from, year_to)
    if key:
        cache.set(key, data, ttl)


def _scenario_stamp(scenario_id) -> str | None:
    row = Scenario.objects.filter(pk=scenario_id).values_list("updated_at", flat=True).first()
    return str(int(row.timestamp())) if row else None


def _build_key(scenario_id, age_group, year_from, year_to) -> str | None:
    stamp = _scenario_stamp(scenario_id)
    return f"{_KEY_PREFIX}:{scenario_id}:{stamp}:{age_group}:{year_from}:{year_to}" if stamp else None
