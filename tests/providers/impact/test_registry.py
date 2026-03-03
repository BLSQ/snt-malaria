from django.test import TestCase

from iaso.models.base import Account
from plugins.snt_malaria.models.impact_provider_config import ImpactProviderConfig
from plugins.snt_malaria.providers.impact.idm import IDMImpactProvider
from plugins.snt_malaria.providers.impact.registry import get_provider_for_account
from plugins.snt_malaria.providers.impact.swisstph import SwissTPHImpactProvider


class ProviderRegistryTests(TestCase):
    def setUp(self):
        self.account = Account.objects.create(name="Test Provider Account")

    def test_no_config_returns_none(self):
        """When no ImpactProviderConfig exists, return None."""
        provider = get_provider_for_account(self.account)
        self.assertIsNone(provider)

    def test_swisstph_config_returns_swisstph(self):
        ImpactProviderConfig.objects.create(account=self.account, provider_key="swisstph")
        provider = get_provider_for_account(self.account)
        self.assertIsInstance(provider, SwissTPHImpactProvider)

    def test_idm_config_returns_idm(self):
        ImpactProviderConfig.objects.create(account=self.account, provider_key="idm")
        provider = get_provider_for_account(self.account)
        self.assertIsInstance(provider, IDMImpactProvider)

    def test_unknown_provider_raises(self):
        ImpactProviderConfig.objects.create(account=self.account, provider_key="unknown")
        with self.assertRaises(ValueError):
            get_provider_for_account(self.account)

    def test_none_provider_config_returns_none(self):
        provider = get_provider_for_account(self.account)
        self.assertIsNone(provider)