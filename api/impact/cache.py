"""View-level cache for serialized impact API responses.

Entries are keyed by (scenario_id, scenario.updated_at, latest
updated_at of the scenario's assigned interventions, age_group,
year_from, year_to, selected org unit ids).  The scenario timestamp invalidates the cache
whenever assignments are refreshed (which calls Scenario.save(),
bumping updated_at); the intervention timestamp invalidates it when an
assigned intervention changes.

Keys also carry a per-account generation token; invalidate_account()
drops it so every entry of that account becomes unreachable.
invalidate_accounts_on_commit() does the same once the transaction commits,
e.g. when an intervention's impact_ref changes, and invalidate_for_org_units()
for every account whose default version holds one of the given org units,
e.g. when their impact mapping changes.

The TTL is read from ImpactProviderConfig.cache_ttl_seconds.
Setting it to 0 disables caching entirely.
"""

from __future__ import annotations

import hashlib

from uuid import uuid4

from django.core.cache import cache
from django.db import transaction
from django.db.models import Max

from iaso.models import Account, OrgUnit
from plugins.snt_malaria.models import ImpactProviderConfig, Scenario


_KEY_PREFIX = "snt_impact"
# Bump whenever the serialized response shape changes, so entries cached in the old shape are never served.
_RESPONSE_VERSION = 3


def get_ttl(account) -> int:
    row = ImpactProviderConfig.objects.filter(account=account).values("cache_ttl_seconds").first()
    return row["cache_ttl_seconds"] if row else ImpactProviderConfig.DEFAULT_CACHE_TTL_SECONDS


def get(scenario_id, age_group, year_from, year_to, org_unit_ids=None) -> dict | None:
    key = _build_key(scenario_id, age_group, year_from, year_to, org_unit_ids)
    return cache.get(key) if key else None


def set(scenario_id, age_group, year_from, year_to, org_unit_ids, data, ttl) -> None:
    key = _build_key(scenario_id, age_group, year_from, year_to, org_unit_ids)
    if key:
        cache.set(key, data, ttl)


def invalidate_account(account_id) -> None:
    cache.delete(_generation_key(account_id))


def invalidate_accounts_on_commit(account_ids) -> None:
    """Deferred so a concurrent request cannot cache results computed from the not-yet-committed state."""
    generation_keys = [_generation_key(account_id) for account_id in account_ids]
    transaction.on_commit(lambda: cache.delete_many(generation_keys))


def invalidate_for_org_units(org_unit_ids) -> None:
    """Invalidate, once the transaction commits, the accounts whose impact results can include these org units."""
    account_ids = Account.objects.filter(
        default_version_id__in=OrgUnit.objects.filter(id__in=org_unit_ids).values("version_id")
    ).values_list("id", flat=True)
    invalidate_accounts_on_commit(account_ids)


def _generation_key(account_id) -> str:
    return f"{_KEY_PREFIX}:gen:{account_id}"


def _account_generation(account_id) -> str:
    key = _generation_key(account_id)
    generation = cache.get(key)
    if generation is None:
        cache.add(key, uuid4().hex, None)
        generation = cache.get(key)
    return generation


def _scenario_stamp(scenario_id) -> str | None:
    row = (
        Scenario.objects.filter(pk=scenario_id)
        .annotate(interventions_updated_at=Max("intervention_assignments__intervention__updated_at"))
        .values_list("account_id", "updated_at", "interventions_updated_at")
        .first()
    )
    if not row:
        return None
    account_id, scenario_updated_at, interventions_updated_at = row
    interventions_stamp = int(interventions_updated_at.timestamp()) if interventions_updated_at else 0
    generation = _account_generation(account_id)
    return f"{generation}:{int(scenario_updated_at.timestamp())}-{interventions_stamp}"


def _org_units_fragment(org_unit_ids) -> str:
    if not org_unit_ids:
        return "all"
    joined = ",".join(str(id_) for id_ in sorted(frozenset(org_unit_ids)))
    return hashlib.sha1(joined.encode()).hexdigest()


def _build_key(scenario_id, age_group, year_from, year_to, org_unit_ids=None) -> str | None:
    stamp = _scenario_stamp(scenario_id)
    if not stamp:
        return None
    org_units = _org_units_fragment(org_unit_ids)
    return f"{_KEY_PREFIX}:v{_RESPONSE_VERSION}:{scenario_id}:{stamp}:{age_group}:{year_from}:{year_to}:{org_units}"
