from datetime import date
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase

from iaso.models import Account, MetricType, MetricValue, OrgUnit, OrgUnitType
from iaso.models.data_source import DataSource, SourceVersion
from iaso.models.project import Project
from plugins.snt_malaria.models import ImpactProviderConfig, Intervention, InterventionCategory
from plugins.snt_malaria.providers.impact.base import (
    ImpactProviderMeta,
    IncompleteConfigError,
    InterventionMappingError,
)
from plugins.snt_malaria.providers.impact.fake import (
    AGE_GROUP_ALL,
    AGE_GROUP_CASE_MULTIPLIER,
    AGE_GROUP_PREVALENCE_MULTIPLIER,
    AGE_GROUP_UNDER5,
    AGE_GROUPS,
    ANNUAL_DRIFT,
    BASELINE_INCIDENCE_PER_1000,
    INTERVENTION_EFFECT,
    YEAR_SPAN,
    FakeImpactProvider,
)


_FROZEN_YEAR = 2030
_FROZEN_DATE = date(_FROZEN_YEAR, 6, 15)


def _cases(result) -> float:
    """Extract the central case count from an ImpactResult (value is never None for fake)."""
    value = result.number_cases.value
    assert value is not None
    return value


class MockIntervention:
    def __init__(self, impact_ref=""):
        self.impact_ref = impact_ref

    def __str__(self):
        return f"MockIntervention(impact_ref={self.impact_ref!r})"


class MockOrgUnit:
    def __init__(self, id, name):
        self.id = id
        self.name = name


def _make_provider(account):
    config = ImpactProviderConfig.objects.create(
        account=account, provider_key="fake", config={"population_metric_code": "POP"}, secret=""
    )
    return FakeImpactProvider(
        config_id=config.id,
        config=config.config,
        secret=config.secret,
    )


class FakeProviderConfigTests(TestCase):
    def setUp(self):
        self.account = Account.objects.create(name="Fake Provider Account")

    def test_missing_population_metric_code_raises(self):
        config = ImpactProviderConfig.objects.create(account=self.account, provider_key="fake", config={}, secret="")
        with self.assertRaises(IncompleteConfigError):
            FakeImpactProvider(
                config_id=config.id,
                config=config.config,
                secret=config.secret,
            )

    def test_blank_population_metric_code_raises(self):
        config = ImpactProviderConfig.objects.create(
            account=self.account, provider_key="fake", config={"population_metric_code": ""}, secret=""
        )
        with self.assertRaises(IncompleteConfigError):
            FakeImpactProvider(
                config_id=config.id,
                config=config.config,
                secret=config.secret,
            )

    def test_valid_config_initialises(self):
        provider = _make_provider(self.account)
        self.assertEqual(provider._population_metric_code, "POP")
        self.assertEqual(provider._account_id, self.account.id)

    def test_get_meta_returns_provider_key(self):
        provider = _make_provider(self.account)
        self.assertEqual(provider.get_meta(), ImpactProviderMeta(provider_key="fake"))


class FakeProviderYearRangeAndAgeGroupsTests(TestCase):
    def setUp(self):
        self.account = Account.objects.create(name="Year Range Account")
        self.provider = _make_provider(self.account)

    def test_year_range_is_rolling(self):
        with patch("plugins.snt_malaria.providers.impact.fake.date") as mock_date:
            mock_date.today.return_value = _FROZEN_DATE
            self.assertEqual(self.provider.get_year_range(), (_FROZEN_YEAR, _FROZEN_YEAR + YEAR_SPAN))

    def test_year_range_spans_six_years(self):
        with patch("plugins.snt_malaria.providers.impact.fake.date") as mock_date:
            mock_date.today.return_value = _FROZEN_DATE
            lo, hi = self.provider.get_year_range()
        self.assertEqual(hi - lo + 1, 6)

    def test_age_groups_are_fixed(self):
        self.assertEqual(self.provider.get_age_groups(), [AGE_GROUP_UNDER5, AGE_GROUP_ALL])
        self.assertEqual(AGE_GROUPS, [AGE_GROUP_UNDER5, AGE_GROUP_ALL])


class FakeProviderInterventionMappingTests(TestCase):
    def setUp(self):
        self.account = Account.objects.create(name="Intervention Mapping Account")
        self.provider = _make_provider(self.account)

    def test_known_refs_pass_through(self):
        for ref in INTERVENTION_EFFECT.keys():
            self.assertEqual(self.provider._map_intervention(MockIntervention(impact_ref=ref)), ref)

    def test_empty_impact_ref_raises(self):
        with self.assertRaises(InterventionMappingError) as ctx:
            self.provider._map_intervention(MockIntervention(impact_ref=""))
        self.assertIn("no impact_ref", str(ctx.exception))

    def test_unknown_impact_ref_raises(self):
        with self.assertRaises(InterventionMappingError) as ctx:
            self.provider._map_intervention(MockIntervention(impact_ref="impact_99"))
        self.assertIn("Unknown impact_ref", str(ctx.exception))

    def test_whitespace_is_stripped(self):
        self.assertEqual(
            self.provider._map_intervention(MockIntervention(impact_ref="  impact_3  ")),
            "impact_3",
        )


class FakeProviderMatchImpactTests(TestCase):
    """Integration tests for match_impact_bulk using real ORM rows."""

    @classmethod
    def setUpTestData(cls):
        cls.account = Account.objects.create(name="Match Impact Account")
        cls.user = User.objects.create(username="fake-test-user")

        project = Project.objects.create(name="Project", app_id="APP_ID", account=cls.account)
        source = DataSource.objects.create(name="ds")
        source.projects.add(project)
        version = SourceVersion.objects.create(data_source=source, number=1)
        cls.account.default_version = version
        cls.account.save()

        ou_type = OrgUnitType.objects.create(name="DISTRICT")
        cls.ou1 = OrgUnit.objects.create(name="OU 1", org_unit_type=ou_type, version=version)
        cls.ou2 = OrgUnit.objects.create(name="OU 2", org_unit_type=ou_type, version=version)
        cls.ou_without_pop = OrgUnit.objects.create(name="OU No Pop", org_unit_type=ou_type, version=version)

        metric_type = MetricType.objects.create(account=cls.account, name="Population", code="POP")
        MetricValue.objects.create(metric_type=metric_type, org_unit=cls.ou1, value=100_000, year=_FROZEN_YEAR - 1)
        MetricValue.objects.create(metric_type=metric_type, org_unit=cls.ou1, value=120_000, year=_FROZEN_YEAR)
        MetricValue.objects.create(metric_type=metric_type, org_unit=cls.ou2, value=50_000, year=_FROZEN_YEAR)

        category = InterventionCategory.objects.create(name="cat", account=cls.account, created_by=cls.user)
        cls.intervention_1 = Intervention.objects.create(
            name="i1", code="i1", intervention_category=category, impact_ref="impact_1", created_by=cls.user
        )
        cls.intervention_3 = Intervention.objects.create(
            name="i3", code="i3", intervention_category=category, impact_ref="impact_3", created_by=cls.user
        )
        cls.intervention_5 = Intervention.objects.create(
            name="i5", code="i5", intervention_category=category, impact_ref="impact_5", created_by=cls.user
        )
        cls.intervention_unknown = Intervention.objects.create(
            name="bad", code="bad", intervention_category=category, impact_ref="impact_99", created_by=cls.user
        )

    def setUp(self):
        self.provider = _make_provider(self.account)
        self._patch_date = patch("plugins.snt_malaria.providers.impact.fake.date")
        mock_date = self._patch_date.start()
        mock_date.today.return_value = _FROZEN_DATE
        self.addCleanup(self._patch_date.stop)

    def _bulk(self, interventions, org_units=None, age_group=AGE_GROUP_ALL, **kwargs):
        return self.provider.match_impact_bulk(
            org_units=list(org_units if org_units is not None else [self.ou1]),
            interventions=interventions,
            age_group=age_group,
            **kwargs,
        )

    def test_returns_one_result_per_year_in_the_window(self):
        bulk = self._bulk([])
        self.assertIn(self.ou1.id, bulk.results)
        self.assertEqual(len(bulk.results[self.ou1.id]), YEAR_SPAN + 1)
        years = [r.year for r in bulk.results[self.ou1.id]]
        self.assertEqual(years, list(range(_FROZEN_YEAR, _FROZEN_YEAR + YEAR_SPAN + 1)))

    def test_uses_latest_population_value(self):
        bulk = self._bulk([])
        for result in bulk.results[self.ou1.id]:
            self.assertEqual(result.population, 120_000)

    def test_population_with_null_year_is_accepted(self):
        """Data layers sometimes store a single time-invariant snapshot with year=None."""
        MetricValue.objects.filter(org_unit=self.ou1).delete()
        metric_type = MetricType.objects.get(account=self.account, code="POP")
        MetricValue.objects.create(metric_type=metric_type, org_unit=self.ou1, value=75_000, year=None)

        bulk = self._bulk([], org_units=[self.ou1])
        self.assertIn(self.ou1.id, bulk.results)
        for result in bulk.results[self.ou1.id]:
            self.assertEqual(result.population, 75_000)
        self.assertEqual(bulk.warnings.org_units_not_found, [])

    def test_dated_population_preferred_over_null_year(self):
        """When both dated and null-year values exist, the dated value wins."""
        MetricValue.objects.filter(org_unit=self.ou1).delete()
        metric_type = MetricType.objects.get(account=self.account, code="POP")
        MetricValue.objects.create(metric_type=metric_type, org_unit=self.ou1, value=1_000, year=None)
        MetricValue.objects.create(metric_type=metric_type, org_unit=self.ou1, value=999_000, year=_FROZEN_YEAR)

        bulk = self._bulk([], org_units=[self.ou1])
        self.assertEqual(bulk.results[self.ou1.id][0].population, 999_000)

    def test_missing_population_emits_not_found_warning(self):
        bulk = self._bulk([], org_units=[self.ou1, self.ou_without_pop])
        self.assertIn(self.ou1.id, bulk.results)
        self.assertNotIn(self.ou_without_pop.id, bulk.results)
        warning_ids = {ref.id for ref in bulk.warnings.org_units_not_found}
        self.assertEqual(warning_ids, {self.ou_without_pop.id})

    def test_unknown_impact_ref_raises(self):
        with self.assertRaises(InterventionMappingError):
            self._bulk([self.intervention_unknown])

    def test_determinism(self):
        first = self._bulk([self.intervention_3])
        second = self._bulk([self.intervention_3])
        firsts = [_cases(r) for r in first.results[self.ou1.id]]
        seconds = [_cases(r) for r in second.results[self.ou1.id]]
        self.assertEqual(firsts, seconds)

    def test_empty_interventions_have_no_drift(self):
        """With no interventions the drift is 0, so the first and last years
        (which the shared seasonal wiggle anchors to 1.0) must match modulo
        per-OU jitter only.
        """
        bulk = self._bulk([])
        values = [_cases(r) for r in bulk.results[self.ou1.id]]
        ratio = values[-1] / values[0]
        self.assertAlmostEqual(ratio, 1.0, delta=0.12)

    def test_impact_1_trajectory_trends_up(self):
        bulk = self._bulk([self.intervention_1])
        values = [_cases(r) for r in bulk.results[self.ou1.id]]
        self.assertGreater(values[-1], values[0])

    def test_impact_5_trajectory_trends_down(self):
        bulk = self._bulk([self.intervention_5])
        values = [_cases(r) for r in bulk.results[self.ou1.id]]
        self.assertLess(values[-1], values[0])

    def test_stronger_interventions_produce_fewer_initial_cases(self):
        baseline = _cases(self._bulk([]).results[self.ou1.id][0])
        weak = _cases(self._bulk([self.intervention_1]).results[self.ou1.id][0])
        strong = _cases(self._bulk([self.intervention_5]).results[self.ou1.id][0])
        self.assertLess(strong, weak)
        self.assertLess(weak, baseline)

    def test_initial_reduction_matches_table(self):
        """At year 0, cases should equal baseline * (1 - INTERVENTION_EFFECT[ref]) modulo jitter."""
        population = 120_000
        year_zero_baseline = BASELINE_INCIDENCE_PER_1000 / 1000 * population * AGE_GROUP_CASE_MULTIPLIER[AGE_GROUP_ALL]

        for ref_name, effect in INTERVENTION_EFFECT.items():
            intervention = MockIntervention(impact_ref=ref_name)
            bulk = self.provider.match_impact_bulk(
                org_units=[self.ou1], interventions=[intervention], age_group=AGE_GROUP_ALL
            )
            year_zero_value = _cases(bulk.results[self.ou1.id][0])
            expected = year_zero_baseline * (1 - effect)
            # +/- 5% jitter only
            self.assertAlmostEqual(year_zero_value / expected, 1.0, delta=0.06)

    def test_under5_has_fewer_absolute_cases_than_all_ages(self):
        """Under-5 is a subset of total population, so absolute case counts
        should be smaller than the all-ages count (matching real-data shape
        where under-5 ≈ 30% of total malaria cases)."""
        all_ages = _cases(self._bulk([], age_group=AGE_GROUP_ALL).results[self.ou1.id][0])
        under5 = _cases(self._bulk([], age_group=AGE_GROUP_UNDER5).results[self.ou1.id][0])
        ratio = under5 / all_ages
        self.assertAlmostEqual(ratio, AGE_GROUP_CASE_MULTIPLIER[AGE_GROUP_UNDER5], places=5)
        self.assertLess(under5, all_ages)

    def test_under5_has_higher_prevalence_rate_than_all_ages(self):
        """Per-capita prevalence is higher for children than for the full
        population (children suffer more frequent episodes)."""

        def _prev(r):
            assert r.prevalence_rate.value is not None
            return r.prevalence_rate.value

        all_ages = _prev(self._bulk([], age_group=AGE_GROUP_ALL).results[self.ou1.id][0])
        under5 = _prev(self._bulk([], age_group=AGE_GROUP_UNDER5).results[self.ou1.id][0])
        ratio = under5 / all_ages
        self.assertAlmostEqual(ratio, AGE_GROUP_PREVALENCE_MULTIPLIER[AGE_GROUP_UNDER5], places=5)
        self.assertGreater(under5, all_ages)

    def test_under5_trajectory_is_steeper_than_all_ages(self):
        """Drift is amplified for under-5, so a declining intervention should
        drop proportionally further over the year window than for all ages."""
        under5 = [_cases(r) for r in self._bulk([self.intervention_5], age_group=AGE_GROUP_UNDER5).results[self.ou1.id]]
        all_ages = [_cases(r) for r in self._bulk([self.intervention_5], age_group=AGE_GROUP_ALL).results[self.ou1.id]]
        self.assertLess(under5[-1] / under5[0], all_ages[-1] / all_ages[0])

    def test_year_from_and_to_clamp_the_window(self):
        bulk = self._bulk(
            [],
            year_from=_FROZEN_YEAR + 1,
            year_to=_FROZEN_YEAR + 3,
        )
        years = [r.year for r in bulk.results[self.ou1.id]]
        self.assertEqual(years, [_FROZEN_YEAR + 1, _FROZEN_YEAR + 2, _FROZEN_YEAR + 3])

    def test_results_carry_confidence_intervals(self):
        bulk = self._bulk([self.intervention_3])
        result = bulk.results[self.ou1.id][0]
        metric = result.number_cases
        self.assertIsNotNone(metric.value)
        self.assertIsNotNone(metric.lower)
        self.assertIsNotNone(metric.upper)
        assert metric.value is not None and metric.lower is not None and metric.upper is not None
        self.assertLess(metric.lower, metric.value)
        self.assertGreater(metric.upper, metric.value)

    def test_confidence_interval_halfwidth_grows_with_forecast_horizon(self):
        """Uncertainty should compound into the future, so each metric's
        CI halfwidth (as a fraction of the central value) must be strictly
        larger at the final year than at year zero, for all four metrics."""
        results = self._bulk([self.intervention_3]).results[self.ou1.id]
        first, last = results[0], results[-1]
        for metric_name in ("number_cases", "number_severe_cases", "prevalence_rate", "direct_deaths"):
            with self.subTest(metric=metric_name):
                first_metric = getattr(first, metric_name)
                last_metric = getattr(last, metric_name)
                assert first_metric.value is not None and first_metric.upper is not None
                assert last_metric.value is not None and last_metric.upper is not None
                first_halfwidth = (first_metric.upper - first_metric.value) / first_metric.value
                last_halfwidth = (last_metric.upper - last_metric.value) / last_metric.value
                self.assertGreater(last_halfwidth, first_halfwidth)

    def test_match_impact_single_ou(self):
        match = self.provider.match_impact(org_unit=self.ou1, interventions=[], age_group=AGE_GROUP_ALL)
        self.assertEqual(len(match.results), YEAR_SPAN + 1)

    def test_mixed_interventions_average_drift(self):
        bulk = self._bulk([self.intervention_1, self.intervention_5])
        values = [_cases(r) for r in bulk.results[self.ou1.id]]
        expected_drift = (ANNUAL_DRIFT["impact_1"] + ANNUAL_DRIFT["impact_5"]) / 2
        # Drift is negative => last year should be lower than first
        self.assertLess(values[-1], values[0])
        self.assertLess(expected_drift, 0)
