from typing import Optional

from plugins.snt_malaria.providers.impact.base import ImpactProvider


def get_provider_for_account(account) -> Optional[ImpactProvider]:
    """Return the appropriate ImpactProvider for the given account, or None.

    Looks up the ImpactProviderConfig for the account. If none is configured,
    returns None -- callers cannot fetch impact data in that case.
    """
    # Import here to avoid circular imports
    from plugins.snt_malaria.models import ImpactProviderConfig

    config = ImpactProviderConfig.objects.filter(account=account).first()

    if config is None:
        return None

    if config.provider_key == "swisstph":
        from plugins.snt_malaria.providers.impact.swisstph import SwissTPHImpactProvider

        return SwissTPHImpactProvider()

    elif config.provider_key == "idm":
        from plugins.snt_malaria.providers.impact.idm import IDMImpactProvider

        return IDMImpactProvider()

    raise ValueError(f"Unknown impact provider: {config.provider_key}")
