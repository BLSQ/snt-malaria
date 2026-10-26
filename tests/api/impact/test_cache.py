from datetime import timedelta

from django.utils import timezone

from iaso.models import OrgUnit
from plugins.snt_malaria.api.impact import cache as impact_cache
from plugins.snt_malaria.models import Intervention
from plugins.snt_malaria.tests.common_base import SNTMalariaTestCase


class ImpactCacheKeyTestCase(SNTMalariaTestCase):
    auto_create_account = False

    def setUp(self):
        super().setUp()
        self.account, self.user, _, self.version, _ = self.create_snt_account_with_project()
        self.scenario = self.create_snt_scenario(account=self.account, created_by=self.user)
        category = self.create_snt_intervention_category(account=self.account, created_by=self.user)
        self.intervention = self.create_snt_intervention(
            intervention_category=category, created_by=self.user, impact_ref="smc"
        )
        org_unit = OrgUnit.objects.create(name="District", version=self.version)
        self.create_snt_assignment(self.scenario, org_unit, self.intervention, self.user)

    def _key(self):
        return impact_cache._build_key(self.scenario.id, "under5", 2025, 2027)

    def test_key_changes_when_an_assigned_intervention_is_updated(self):
        key_before = self._key()

        Intervention.objects.filter(pk=self.intervention.pk).update(
            impact_ref="pmc", updated_at=timezone.now() + timedelta(seconds=5)
        )

        self.assertNotEqual(self._key(), key_before)

    def test_key_is_stable_without_changes(self):
        self.assertEqual(self._key(), self._key())

    def test_key_for_scenario_without_assignments(self):
        scenario = self.create_snt_scenario(account=self.account, created_by=self.user)

        self.assertIsNotNone(impact_cache._build_key(scenario.id, "under5", 2025, 2027))

    def test_no_key_for_missing_scenario(self):
        self.assertIsNone(impact_cache._build_key(-1, "under5", 2025, 2027))
