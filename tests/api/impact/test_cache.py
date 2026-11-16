from datetime import timedelta

from django.core.cache import cache
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone

from iaso.models import OrgUnit, SourceVersion
from plugins.snt_malaria.api.impact import cache as impact_cache
from plugins.snt_malaria.management.commands.load_impact_org_unit_mappings import load_impact_org_unit_mappings
from plugins.snt_malaria.models import ImpactOrgUnitMapping, Intervention
from plugins.snt_malaria.tests.common_base import SNTMalariaTestCase


LOCMEM_CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}


@override_settings(CACHES=LOCMEM_CACHES)
class ImpactCacheKeyTestCase(SNTMalariaTestCase):
    auto_create_account = False

    def setUp(self):
        super().setUp()
        cache.clear()
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

    def test_key_differs_per_org_unit_selection(self):
        national = impact_cache._build_key(self.scenario.id, "under5", 2025, 2027)
        first = impact_cache._build_key(self.scenario.id, "under5", 2025, 2027, [1, 2])
        second = impact_cache._build_key(self.scenario.id, "under5", 2025, 2027, [1, 3])

        self.assertEqual(len({national, first, second}), 3)

    def test_key_ignores_org_unit_order_and_duplicates(self):
        self.assertEqual(
            impact_cache._build_key(self.scenario.id, "under5", 2025, 2027, [2, 1]),
            impact_cache._build_key(self.scenario.id, "under5", 2025, 2027, [1, 2, 2]),
        )

    def test_empty_org_unit_selection_shares_the_national_key(self):
        self.assertEqual(
            impact_cache._build_key(self.scenario.id, "under5", 2025, 2027, []),
            impact_cache._build_key(self.scenario.id, "under5", 2025, 2027),
        )

    def test_key_changes_after_account_invalidation(self):
        key_before = self._key()

        impact_cache.invalidate_account(self.account.id)

        self.assertNotEqual(self._key(), key_before)

    def test_invalidation_leaves_other_accounts_keys_unchanged(self):
        other_account, other_user = self.create_snt_account()
        other_scenario = self.create_snt_scenario(account=other_account, created_by=other_user)
        other_key_before = impact_cache._build_key(other_scenario.id, "under5", 2025, 2027)

        impact_cache.invalidate_account(self.account.id)

        self.assertEqual(impact_cache._build_key(other_scenario.id, "under5", 2025, 2027), other_key_before)

    def test_cached_response_not_served_after_invalidation(self):
        impact_cache.set(self.scenario.id, "under5", 2025, 2027, None, {"data": 1}, 60)
        self.assertEqual(impact_cache.get(self.scenario.id, "under5", 2025, 2027), {"data": 1})

        impact_cache.invalidate_account(self.account.id)

        self.assertIsNone(impact_cache.get(self.scenario.id, "under5", 2025, 2027))


@override_settings(CACHES=LOCMEM_CACHES)
class InvalidateImpactCacheAdminActionTestCase(SNTMalariaTestCase):
    def setUp(self):
        super().setUp()
        cache.clear()
        self.config = self.create_snt_impact_provider_config()
        self.scenario = self.create_snt_scenario()
        self.user.is_staff = True
        self.user.is_superuser = True
        self.user.save()
        self.client.force_login(self.user)

    def _key(self):
        return impact_cache._build_key(self.scenario.id, "under5", 2025, 2027)

    def test_admin_action_invalidates_selected_accounts_impact_cache(self):
        key_before = self._key()

        response = self.client.post(
            reverse("admin:snt_malaria_impactproviderconfig_changelist"),
            {"action": "invalidate_impact_cache", "_selected_action": [self.config.pk]},
        )

        self.assertEqual(response.status_code, 302)
        self.assertNotEqual(self._key(), key_before)


@override_settings(CACHES=LOCMEM_CACHES)
class ImpactMappingChangeInvalidatesCacheTestCase(SNTMalariaTestCase):
    auto_create_account = False

    def setUp(self):
        super().setUp()
        cache.clear()
        self.account, self.user, self.source, self.version, _ = self.create_snt_account_with_project()
        self.user.is_staff = True
        self.user.is_superuser = True
        self.user.save()
        self.client.force_login(self.user)
        self.scenario = self.create_snt_scenario(account=self.account, created_by=self.user)
        self.org_unit = OrgUnit.objects.create(name="District", version=self.version)
        self.other_org_unit = OrgUnit.objects.create(name="Other district", version=self.version)
        self.mapping = ImpactOrgUnitMapping.objects.create(org_unit=self.org_unit, reference="District-1")

        self.other_account, other_user, _, _, _ = self.create_snt_account_with_project(
            source_name="other source", project_name="other project"
        )
        self.other_scenario = self.create_snt_scenario(account=self.other_account, created_by=other_user)

    def _keys(self):
        return (
            impact_cache._build_key(self.scenario.id, "under5", 2025, 2027),
            impact_cache._build_key(self.other_scenario.id, "under5", 2025, 2027),
        )

    def _assert_only_own_account_invalidated(self, keys_before):
        key, other_key = self._keys()
        self.assertNotEqual(key, keys_before[0])
        self.assertEqual(other_key, keys_before[1])

    def test_invalidate_for_org_units_drops_accounts_whose_default_version_holds_them_on_commit(self):
        keys_before = self._keys()

        with self.captureOnCommitCallbacks(execute=True) as callbacks:
            impact_cache.invalidate_for_org_units([self.org_unit.id])
            self.assertEqual(self._keys(), keys_before)

        self.assertEqual(len(callbacks), 1)
        self._assert_only_own_account_invalidated(keys_before)

    def test_invalidate_for_org_units_ignores_org_units_outside_default_versions(self):
        older_version = SourceVersion.objects.create(data_source=self.source, number=0)
        stray_org_unit = OrgUnit.objects.create(name="Stray", version=older_version)
        keys_before = self._keys()

        with self.captureOnCommitCallbacks(execute=True):
            impact_cache.invalidate_for_org_units([stray_org_unit.id])

        self.assertEqual(self._keys(), keys_before)

    def test_admin_edit_of_mapping_reference_invalidates_account_cache(self):
        keys_before = self._keys()

        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(
                reverse("admin:snt_malaria_impactorgunitmapping_change", args=[self.mapping.pk]),
                {"org_unit": self.org_unit.pk, "reference": "District-2"},
            )

        self.assertEqual(response.status_code, 302)
        self._assert_only_own_account_invalidated(keys_before)

    def test_admin_delete_of_mapping_invalidates_account_cache(self):
        keys_before = self._keys()

        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(
                reverse("admin:snt_malaria_impactorgunitmapping_delete", args=[self.mapping.pk]),
                {"post": "yes"},
            )

        self.assertEqual(response.status_code, 302)
        self.assertFalse(ImpactOrgUnitMapping.objects.exists())
        self._assert_only_own_account_invalidated(keys_before)

    def test_admin_bulk_delete_of_mappings_invalidates_account_cache(self):
        keys_before = self._keys()

        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(
                reverse("admin:snt_malaria_impactorgunitmapping_changelist"),
                {"action": "delete_selected", "_selected_action": [self.mapping.pk], "post": "yes"},
            )

        self.assertEqual(response.status_code, 302)
        self.assertFalse(ImpactOrgUnitMapping.objects.exists())
        self._assert_only_own_account_invalidated(keys_before)

    def test_loading_mappings_from_file_invalidates_account_cache(self):
        keys_before = self._keys()

        with self.captureOnCommitCallbacks(execute=True):
            load_impact_org_unit_mappings(
                account=self.account,
                mapping_nodes=[{"name": "Other district", "reference": "Other-1"}],
            )

        self._assert_only_own_account_invalidated(keys_before)

    def test_loading_mappings_without_any_match_keeps_cache(self):
        keys_before = self._keys()

        with self.captureOnCommitCallbacks(execute=True):
            load_impact_org_unit_mappings(
                account=self.account,
                mapping_nodes=[{"name": "Unknown", "reference": "Unknown-1"}],
            )

        self.assertEqual(self._keys(), keys_before)
