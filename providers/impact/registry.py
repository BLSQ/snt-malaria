import logging

from typing import Optional

from plugins.snt_malaria.providers.impact.base import ImpactProvider, IncompleteConfigError


logger = logging.getLogger(__name__)


def get_provider_for_account(account) -> Optional[ImpactProvider]:
    """Return the appropriate ImpactProvider for the given account, or None.

    Looks up the ImpactProviderConfig for the account. If none is configured
    or the configuration is incomplete, returns None -- callers cannot fetch
    impact data in that case.
    """
    # Import here to avoid circular imports
    from plugins.snt_malaria.models import ImpactProviderConfig

    provider_config = ImpactProviderConfig.objects.filter(account=account).first()

    if provider_config is None:
        return None

    kwargs = {
        "config_id": provider_config.id,
        "config": provider_config.config,
        "secret": provider_config.secret,
    }

    try:
        if provider_config.provider_key == ImpactProviderConfig.ProviderKey.SWISSTPH:
            from plugins.snt_malaria.providers.impact.swisstph import SwissTPHImpactProvider

            return SwissTPHImpactProvider(**kwargs)

        if provider_config.provider_key == ImpactProviderConfig.ProviderKey.IDM:
            from plugins.snt_malaria.providers.impact.idm import IDMImpactProvider

            return IDMImpactProvider(**kwargs)
    except IncompleteConfigError:
        logger.warning(
            "Impact provider config %d for account '%s' has incomplete settings; returning no provider.",
            provider_config.id,
            account,
        )
        return None

    raise ValueError(f"Unknown impact provider: {provider_config.provider_key}")
