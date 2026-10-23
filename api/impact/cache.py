from __future__ import annotations


"""View-level cache for serialized impact API responses.

Entries are keyed by (scenario_id, scenario.updated_at, latest
updated_at of the scenario's assigned interventions, age_group,
year_from, year_to).  The scenario timestamp invalidates the cache
whenever assignments are refreshed (which calls Scenario.save(),
bumping updated_at); the intervention timestamp invalidates it when an
assigned intervention changes, e.g. its impact_ref.

The TTL is read from ImpactProviderConfig.cache_ttl_seconds.
Setting it to 0 disables caching entirely.
"""

from django.core.cache import cache
from django.db.models import Max

from plugins.snt_malaria.models import ImpactProviderConfig, Scenario


_KEY_PREFIX = "snt_impact"
# Bump whenever the serialized response shape changes, so entries cached in the old shape are never served.
_RESPONSE_VERSION = 2


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
    row = (
        Scenario.objects.filter(pk=scenario_id)
        .annotate(interventions_updated_at=Max("intervention_assignments__intervention__updated_at"))
        .values_list("updated_at", "interventions_updated_at")
        .first()
    )
    if not row:
        return None
    scenario_updated_at, interventions_updated_at = row
    interventions_stamp = int(interventions_updated_at.timestamp()) if interventions_updated_at else 0
    return f"{int(scenario_updated_at.timestamp())}-{interventions_stamp}"


def _build_key(scenario_id, age_group, year_from, year_to) -> str | None:
    stamp = _scenario_stamp(scenario_id)
    return (
        f"{_KEY_PREFIX}:v{_RESPONSE_VERSION}:{scenario_id}:{stamp}:{age_group}:{year_from}:{year_to}" if stamp else None
    )
