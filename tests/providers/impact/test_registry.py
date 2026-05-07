from unittest.mock import patch

from plugins.snt_malaria.models.impact_provider_config import ImpactProviderConfig
from plugins.snt_malaria.providers.impact.base import ImpactProviderMeta
from plugins.snt_malaria.providers.impact.fake import FakeImpactProvider
from plugins.snt_malaria.providers.impact.idm import IDMImpactProvider
from plugins.snt_malaria.providers.impact.registry import get_provider_for_account
from plugins.snt_malaria.providers.impact.swisstph import SwissTPHImpactProvider
from plugins.snt_malaria.tests.common_base import SNTMalariaTestCase


DUMMY_CONFIG = {"db_name": "test", "db_host": "localhost", "db_port": 5432, "db_username": "user"}
DUMMY_SECRET = "s3cret"

_SWISSTPH_DB_PATCH = "plugins.snt_malaria.providers.impact.swisstph.ensure_db_connection"
_IDM_DB_PATCH = "plugins.snt_malaria.providers.impact.idm.ensure_db_connection"


class ProviderRegistryTests(SNTMalariaTestCase):
    auto_create_account = False

    def setUp(self):
        super().setUp()
        self.account, _ = self.create_snt_account(name="Test Provider Account")

    def test_no_config_returns_none(self):
        """When no ImpactProviderConfig exists, return None."""
        provider = get_provider_for_account(self.account)
        self.assertIsNone(provider)

    @patch(_SWISSTPH_DB_PATCH, return_value="default")
    def test_swisstph_config_returns_swisstph(self, _mock_ensure):
        ImpactProviderConfig.objects.create(
            account=self.account, provider_key="swisstph", config=DUMMY_CONFIG, secret=DUMMY_SECRET
        )
        provider = get_provider_for_account(self.account)
        self.assertIsInstance(provider, SwissTPHImpactProvider)
        self.assertEqual(provider.config, DUMMY_CONFIG)
        self.assertEqual(provider.secret, DUMMY_SECRET)
        self.assertEqual(provider.meta.provider_key, "swisstph")

    @patch(_IDM_DB_PATCH, return_value="default")
    def test_idm_config_returns_idm(self, _mock_ensure):
        ImpactProviderConfig.objects.create(
            account=self.account, provider_key="idm", config=DUMMY_CONFIG, secret=DUMMY_SECRET
        )
        provider = get_provider_for_account(self.account)
        self.assertIsInstance(provider, IDMImpactProvider)
        self.assertEqual(provider.config, DUMMY_CONFIG)
        self.assertEqual(provider.secret, DUMMY_SECRET)
        self.assertEqual(provider.meta.provider_key, "idm")

    def test_fake_config_returns_fake(self):
        ImpactProviderConfig.objects.create(
            account=self.account,
            provider_key="fake",
            config={"population_metric_code": "POP"},
            secret="",
        )
        provider = get_provider_for_account(self.account)
        self.assertIsInstance(provider, FakeImpactProvider)
        self.assertEqual(provider.meta.provider_key, "fake")

    def test_fake_provider_get_meta_returns_provider_key(self):
        ImpactProviderConfig.objects.create(
            account=self.account,
            provider_key="fake",
            config={"population_metric_code": "POP"},
            secret="",
        )
        provider = get_provider_for_account(self.account)
        assert provider is not None
        self.assertEqual(provider.get_meta(), ImpactProviderMeta(provider_key="fake"))

    def test_fake_incomplete_config_returns_none(self):
        """Fake provider without population_metric_code should be treated as incomplete."""
        ImpactProviderConfig.objects.create(account=self.account, provider_key="fake", config={}, secret="")
        provider = get_provider_for_account(self.account)
        self.assertIsNone(provider)

    def test_unknown_provider_raises(self):
        ImpactProviderConfig.objects.create(account=self.account, provider_key="unknown")
        with self.assertRaises(ValueError):
            get_provider_for_account(self.account)

    def test_none_provider_config_returns_none(self):
        provider = get_provider_for_account(self.account)
        self.assertIsNone(provider)

    def test_incomplete_config_returns_none(self):
        """When config exists but is missing required DB fields, return None gracefully."""
        ImpactProviderConfig.objects.create(account=self.account, provider_key="swisstph", config={}, secret="")
        provider = get_provider_for_account(self.account)
        self.assertIsNone(provider)
