from unittest import mock
from unittest.mock import Mock

from iaso.models import OrgUnit, OrgUnitType
from iaso.test import TestCase
from plugins.snt_malaria.models import Budget, Intervention, InterventionAssignment, InterventionCategory, Scenario
from plugins.snt_malaria.providers.impact.base import (
    BulkMatchResult,
    ImpactMetricWithConfidenceInterval,
    ImpactResult,
    MatchResult,
    MatchWarnings,
)
from plugins.snt_malaria.services.impact import (
    ImpactService,
    OrgUnitImpactMetrics,
    _aggregate_metrics,
)


def _metric(value=None, lower=None, upper=None):
    return ImpactMetricWithConfidenceInterval(value=value, lower=lower, upper=upper)


class AggregateMetricsTestCase(TestCase):
    """Tests for _aggregate_metrics module-level function."""

    def test_sums_number_cases_number_severe_cases_direct_deaths_and_cost(self):
        metrics = [
            OrgUnitImpactMetrics(
                org_unit_id=1,
                org_unit_name="OU1",
                number_cases=_metric(100.0),
                number_severe_cases=_metric(10.0),
                direct_deaths=_metric(2.0),
                cost=5000.0,
            ),
            OrgUnitImpactMetrics(
                org_unit_id=2,
                org_unit_name="OU2",
                number_cases=_metric(50.0),
                number_severe_cases=_metric(5.0),
                direct_deaths=_metric(1.0),
                cost=3000.0,
            ),
        ]
        result = _aggregate_metrics(metrics)
        self.assertEqual(result.number_cases.value, 150.0)
        self.assertEqual(result.number_severe_cases.value, 15.0)
        self.assertEqual(result.direct_deaths.value, 3.0)
        self.assertEqual(result.cost, 8000.0)

    def test_averages_prevalence_rate(self):
        metrics = [
            OrgUnitImpactMetrics(
                org_unit_id=1,
                org_unit_name="OU1",
                prevalence_rate=_metric(0.04),
            ),
            OrgUnitImpactMetrics(
                org_unit_id=2,
                org_unit_name="OU2",
                prevalence_rate=_metric(0.06),
            ),
        ]
        result = _aggregate_metrics(metrics)
        self.assertEqual(result.prevalence_rate.value, 0.05)

    def test_empty_list_returns_default_metrics(self):
        result = _aggregate_metrics([])
        self.assertIsNone(result.number_cases.value)
        self.assertIsNone(result.number_severe_cases.value)
        self.assertIsNone(result.direct_deaths.value)
        self.assertIsNone(result.prevalence_rate.value)
        self.assertIsNone(result.cost)

    def test_single_entry_with_none_prevalence_returns_default_prevalence(self):
        metrics = [
            OrgUnitImpactMetrics(
                org_unit_id=1,
                org_unit_name="OU1",
                number_cases=_metric(100.0),
                prevalence_rate=_metric(None),
            ),
        ]
        result = _aggregate_metrics(metrics)
        self.assertEqual(result.number_cases.value, 100.0)
        self.assertIsNone(result.prevalence_rate.value)

    def test_cost_none_when_no_metrics_have_cost(self):
        metrics = [
            OrgUnitImpactMetrics(org_unit_id=1, org_unit_name="OU1", cost=None),
            OrgUnitImpactMetrics(org_unit_id=2, org_unit_name="OU2", cost=None),
        ]
        result = _aggregate_metrics(metrics)
        self.assertIsNone(result.cost)

    def test_cost_sums_only_non_none(self):
        metrics = [
            OrgUnitImpactMetrics(org_unit_id=1, org_unit_name="OU1", cost=5000.0),
            OrgUnitImpactMetrics(org_unit_id=2, org_unit_name="OU2", cost=None),
            OrgUnitImpactMetrics(org_unit_id=3, org_unit_name="OU3", cost=2000.0),
        ]
        result = _aggregate_metrics(metrics)
        self.assertEqual(result.cost, 7000.0)


class ImpactServiceGetScenarioImpactTestCase(TestCase):
    """Tests for ImpactService.get_scenario_impact with mocked provider."""

    def setUp(self):
        self.account, self.source, self.version, self.project = self.create_account_datasource_version_project(
            "source", "Impact Service Account", "project"
        )
        self.user = self.create_user_with_profile(username="impact_service_user", account=self.account)

        self.scenario = Scenario.objects.create(
            account=self.account,
            created_by=self.user,
            name="Test Scenario",
            start_year=2025,
            end_year=2027,
        )

        self.int_category = InterventionCategory.objects.create(
            name="Chemoprevention",
            account=self.account,
            created_by=self.user,
        )
        self.intervention1 = Intervention.objects.create(
            name="SMC",
            created_by=self.user,
            intervention_category=self.int_category,
            code="smc",
        )
        self.intervention2 = Intervention.objects.create(
            name="IPTp",
            created_by=self.user,
            intervention_category=self.int_category,
            code="iptp",
        )

        self.org_unit_type = OrgUnitType.objects.create(name="DISTRICT")
        self.org_unit_type.projects.set([self.project])

        self.district1 = OrgUnit.objects.create(
            org_unit_type=self.org_unit_type,
            name="District 1",
            version=self.version,
            validation_status=OrgUnit.VALIDATION_VALID,
        )
        self.district2 = OrgUnit.objects.create(
            org_unit_type=self.org_unit_type,
            name="District 2",
            version=self.version,
            validation_status=OrgUnit.VALIDATION_VALID,
        )
        self.district3 = OrgUnit.objects.create(
            org_unit_type=self.org_unit_type,
            name="District 3",
            version=self.version,
            validation_status=OrgUnit.VALIDATION_VALID,
        )

        InterventionAssignment.objects.create(
            scenario=self.scenario,
            org_unit=self.district1,
            intervention=self.intervention1,
            created_by=self.user,
        )
        InterventionAssignment.objects.create(
            scenario=self.scenario,
            org_unit=self.district2,
            intervention=self.intervention1,
            created_by=self.user,
        )
        # District 3 has both interventions
        InterventionAssignment.objects.create(
            scenario=self.scenario,
            org_unit=self.district3,
            intervention=self.intervention1,
            created_by=self.user,
        )
        InterventionAssignment.objects.create(
            scenario=self.scenario,
            org_unit=self.district3,
            intervention=self.intervention2,
            created_by=self.user,
        )

        Budget.objects.create(
            scenario=self.scenario,
            name="Test Budget",
            created_by=self.user,
            cost_input={},
            population_input={},
            assumptions={},
            results=[
                {
                    "year": 2025,
                    "org_units_costs": [
                        {"org_unit_id": self.district1.id, "total_cost": 5000.0},
                        {"org_unit_id": self.district2.id, "total_cost": 3000.0},
                        {"org_unit_id": self.district3.id, "total_cost": 7000.0},
                    ],
                },
                {
                    "year": 2026,
                    "org_units_costs": [
                        {"org_unit_id": self.district1.id, "total_cost": 5500.0},
                        {"org_unit_id": self.district2.id, "total_cost": 3500.0},
                        {"org_unit_id": self.district3.id, "total_cost": 7500.0},
                    ],
                },
            ],
        )

    def _make_impact_results(self):
        """Return a dict of org_unit_id -> [ImpactResult] with distinct values per district and year."""
        return {
            self.district1.id: [
                ImpactResult(
                    year=2025,
                    population=1000.0,
                    number_cases=_metric(100.0),
                    number_severe_cases=_metric(10.0),
                    prevalence_rate=_metric(0.04),
                    direct_deaths=_metric(2.0),
                ),
                ImpactResult(
                    year=2026,
                    population=1100.0,
                    number_cases=_metric(110.0),
                    number_severe_cases=_metric(11.0),
                    prevalence_rate=_metric(0.05),
                    direct_deaths=_metric(3.0),
                ),
            ],
            self.district2.id: [
                ImpactResult(
                    year=2025,
                    population=2000.0,
                    number_cases=_metric(200.0),
                    number_severe_cases=_metric(20.0),
                    prevalence_rate=_metric(0.06),
                    direct_deaths=_metric(4.0),
                ),
                ImpactResult(
                    year=2026,
                    population=2100.0,
                    number_cases=_metric(210.0),
                    number_severe_cases=_metric(21.0),
                    prevalence_rate=_metric(0.07),
                    direct_deaths=_metric(5.0),
                ),
            ],
            self.district3.id: [
                ImpactResult(
                    year=2025,
                    population=3000.0,
                    number_cases=_metric(300.0),
                    number_severe_cases=_metric(30.0),
                    prevalence_rate=_metric(0.08),
                    direct_deaths=_metric(6.0),
                ),
                ImpactResult(
                    year=2026,
                    population=3100.0,
                    number_cases=_metric(310.0),
                    number_severe_cases=_metric(31.0),
                    prevalence_rate=_metric(0.09),
                    direct_deaths=_metric(7.0),
                ),
            ],
        }

    def _make_provider_mock(self, supports_bulk, warnings=None):
        """Build a mock provider wired with realistic per-org-unit results."""
        results_by_ou = self._make_impact_results()
        mock_provider = Mock()
        mock_provider.supports_bulk = supports_bulk

        w = warnings or MatchWarnings()

        mock_provider.match_impact.side_effect = lambda org_unit, **kw: MatchResult(
            results=results_by_ou[org_unit.id],
            warnings=w,
        )
        mock_provider.match_impact_bulk.side_effect = lambda org_units, **kw: BulkMatchResult(
            results={ou.id: results_by_ou[ou.id] for ou in org_units},
            warnings=w,
        )
        return mock_provider

    def _assert_scenario_impact(self, result):
        """Shared assertions on a ScenarioImpactMetrics produced from _make_impact_results + Budget fixture."""
        self.assertEqual(result.scenario_id, self.scenario.id)

        # -- Top-level aggregation (3 districts x 2 years = 6 entries) --
        # cases: 600 + 630 = 1230, severe: 60 + 63 = 123, deaths: 12 + 15 = 27
        # prevalence: avg(0.04,0.06,0.08,0.05,0.07,0.09) = 0.065
        # cost: 15000 + 16500 = 31500
        self.assertEqual(result.number_cases.value, 1230.0)
        self.assertEqual(result.number_severe_cases.value, 123.0)
        self.assertAlmostEqual(result.prevalence_rate.value, 0.065)
        self.assertEqual(result.direct_deaths.value, 27.0)
        self.assertEqual(result.cost, 31500.0)

        # -- by_year breakdown --
        self.assertEqual(len(result.by_year), 2)

        year_2025 = result.by_year[0]
        self.assertEqual(year_2025.year, 2025)
        self.assertEqual(year_2025.number_cases.value, 600.0)
        self.assertEqual(year_2025.number_severe_cases.value, 60.0)
        self.assertAlmostEqual(year_2025.prevalence_rate.value, 0.06)
        self.assertEqual(year_2025.direct_deaths.value, 12.0)
        self.assertEqual(year_2025.cost, 15000.0)

        self.assertEqual(len(year_2025.org_units), 3)
        ou_2025 = {ou.org_unit_id: ou for ou in year_2025.org_units}
        self.assertEqual(ou_2025[self.district1.id].number_cases.value, 100.0)
        self.assertEqual(ou_2025[self.district1.id].cost, 5000.0)
        self.assertEqual(ou_2025[self.district2.id].number_cases.value, 200.0)
        self.assertEqual(ou_2025[self.district2.id].cost, 3000.0)
        self.assertEqual(ou_2025[self.district3.id].number_cases.value, 300.0)
        self.assertEqual(ou_2025[self.district3.id].cost, 7000.0)

        year_2026 = result.by_year[1]
        self.assertEqual(year_2026.year, 2026)
        self.assertEqual(year_2026.number_cases.value, 630.0)
        self.assertEqual(year_2026.number_severe_cases.value, 63.0)
        self.assertAlmostEqual(year_2026.prevalence_rate.value, 0.07)
        self.assertEqual(year_2026.direct_deaths.value, 15.0)
        self.assertEqual(year_2026.cost, 16500.0)

        self.assertEqual(len(year_2026.org_units), 3)
        ou_2026 = {ou.org_unit_id: ou for ou in year_2026.org_units}
        self.assertEqual(ou_2026[self.district1.id].number_cases.value, 110.0)
        self.assertEqual(ou_2026[self.district1.id].cost, 5500.0)
        self.assertEqual(ou_2026[self.district2.id].number_cases.value, 210.0)
        self.assertEqual(ou_2026[self.district2.id].cost, 3500.0)
        self.assertEqual(ou_2026[self.district3.id].number_cases.value, 310.0)
        self.assertEqual(ou_2026[self.district3.id].cost, 7500.0)

        # -- org_units across years --
        self.assertEqual(len(result.org_units), 3)
        agg = {ou.org_unit_id: ou for ou in result.org_units}

        # District 1: cases 100+110=210, prevalence avg(0.04,0.05)=0.045, cost 5000+5500=10500
        self.assertEqual(agg[self.district1.id].number_cases.value, 210.0)
        self.assertEqual(agg[self.district1.id].number_severe_cases.value, 21.0)
        self.assertAlmostEqual(agg[self.district1.id].prevalence_rate.value, 0.045)
        self.assertEqual(agg[self.district1.id].direct_deaths.value, 5.0)
        self.assertEqual(agg[self.district1.id].cost, 10500.0)

        # District 2: cases 200+210=410, prevalence avg(0.06,0.07)=0.065, cost 3000+3500=6500
        self.assertEqual(agg[self.district2.id].number_cases.value, 410.0)
        self.assertEqual(agg[self.district2.id].number_severe_cases.value, 41.0)
        self.assertAlmostEqual(agg[self.district2.id].prevalence_rate.value, 0.065)
        self.assertEqual(agg[self.district2.id].direct_deaths.value, 9.0)
        self.assertEqual(agg[self.district2.id].cost, 6500.0)

        # District 3: cases 300+310=610, prevalence avg(0.08,0.09)=0.085, cost 7000+7500=14500
        self.assertEqual(agg[self.district3.id].number_cases.value, 610.0)
        self.assertEqual(agg[self.district3.id].number_severe_cases.value, 61.0)
        self.assertAlmostEqual(agg[self.district3.id].prevalence_rate.value, 0.085)
        self.assertEqual(agg[self.district3.id].direct_deaths.value, 13.0)
        self.assertEqual(agg[self.district3.id].cost, 14500.0)

        # -- warnings should be empty in the happy path --
        self.assertEqual(result.org_units_not_found, [])
        self.assertEqual(result.org_units_with_unmatched_interventions, [])

    def test_service_calls_match_impact_bulk(self):
        """Test that the service calls match_impact_bulk with correct grouping and produces correct outcomes."""
        mock_provider = self._make_provider_mock(supports_bulk=True)

        service = ImpactService(provider=mock_provider)
        result = service.get_scenario_impact(self.scenario, age_group="under5", year_from=2025, year_to=2027)

        mock_provider.match_impact_bulk.assert_has_calls(
            [
                mock.call(
                    org_units=[self.district1, self.district2],
                    interventions=[self.intervention1],
                    age_group="under5",
                    year_from=2025,
                    year_to=2027,
                ),
                mock.call(
                    org_units=[self.district3],
                    interventions=[self.intervention1, self.intervention2],
                    age_group="under5",
                    year_from=2025,
                    year_to=2027,
                ),
            ]
        )
        mock_provider.match_impact.assert_not_called()
        self._assert_scenario_impact(result)

    def test_service_calls_match_impact(self):
        """Test that the service calls match_impact individually for each org unit and produces correct outcomes."""
        mock_provider = self._make_provider_mock(supports_bulk=False)

        service = ImpactService(provider=mock_provider)
        result = service.get_scenario_impact(self.scenario, age_group="under5", year_from=2025, year_to=2027)

        mock_provider.match_impact.assert_has_calls(
            [
                mock.call(
                    org_unit=self.district1,
                    interventions=[self.intervention1],
                    age_group="under5",
                    year_from=2025,
                    year_to=2027,
                ),
                mock.call(
                    org_unit=self.district2,
                    interventions=[self.intervention1],
                    age_group="under5",
                    year_from=2025,
                    year_to=2027,
                ),
                mock.call(
                    org_unit=self.district3,
                    interventions=[self.intervention1, self.intervention2],
                    age_group="under5",
                    year_from=2025,
                    year_to=2027,
                ),
            ]
        )
        mock_provider.match_impact_bulk.assert_not_called()
        self._assert_scenario_impact(result)

    def test_warnings_propagated_bulk(self):
        """Warnings from the provider should appear on the final ScenarioImpactMetrics."""
        warnings = MatchWarnings(
            org_units_not_found=[self.district1],
            org_units_with_unmatched_interventions=[self.district2],
        )
        mock_provider = self._make_provider_mock(supports_bulk=True, warnings=warnings)

        service = ImpactService(provider=mock_provider)
        result = service.get_scenario_impact(self.scenario, age_group="under5", year_from=2025, year_to=2027)

        not_found_ids = {ou.id for ou in result.org_units_not_found}
        unmatched_ids = {ou.id for ou in result.org_units_with_unmatched_interventions}
        self.assertIn(self.district1.id, not_found_ids)
        self.assertIn(self.district2.id, unmatched_ids)

    def test_warnings_propagated_individual(self):
        """Warnings from match_impact should appear on the final ScenarioImpactMetrics."""
        warnings = MatchWarnings(
            org_units_not_found=[self.district3],
        )
        mock_provider = self._make_provider_mock(supports_bulk=False, warnings=warnings)

        service = ImpactService(provider=mock_provider)
        result = service.get_scenario_impact(self.scenario, age_group="under5", year_from=2025, year_to=2027)

        not_found_ids = {ou.id for ou in result.org_units_not_found}
        self.assertIn(self.district3.id, not_found_ids)
