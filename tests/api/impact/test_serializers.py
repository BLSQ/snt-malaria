from unittest.mock import Mock

from iaso.models import Account
from iaso.test import TestCase
from plugins.snt_malaria.api.impact.serializers import ImpactQuerySerializer, ScenarioImpactSerializer
from plugins.snt_malaria.models import Scenario
from plugins.snt_malaria.providers.impact.base import ImpactMetricWithConfidenceInterval
from plugins.snt_malaria.services.impact import (
    OrgUnitImpactMetrics,
    ScenarioImpactMetrics,
    YearImpactMetrics,
)


def _metric(value=None, lower=None, upper=None):
    return ImpactMetricWithConfidenceInterval(value=value, lower=lower, upper=upper)


class ImpactQuerySerializerTestCase(TestCase):
    def setUp(self):
        self.account = Account.objects.create(name="Impact Serializer Account")
        self.user = self.create_user_with_profile(username="impact_serializer_user", account=self.account)
        self.other_account = Account.objects.create(name="Other Account")
        self.other_user = self.create_user_with_profile(username="other_user", account=self.other_account)
        self.scenario = Scenario.objects.create(
            account=self.account,
            created_by=self.user,
            name="Test Scenario",
            start_year=2025,
            end_year=2027,
        )
        self.context = {"request": Mock(user=self.user)}

    def test_missing_scenario_id(self):
        serializer = ImpactQuerySerializer(
            data={"age_group": "under5"},
            context=self.context,
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("scenario_id", serializer.errors)

    def test_missing_age_group(self):
        serializer = ImpactQuerySerializer(
            data={"scenario_id": self.scenario.id},
            context=self.context,
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("age_group", serializer.errors)

    def test_scenario_from_other_account_rejected(self):
        other_scenario = Scenario.objects.create(
            account=self.other_account,
            created_by=self.other_user,
            name="Other Scenario",
            start_year=2025,
            end_year=2027,
        )
        serializer = ImpactQuerySerializer(
            data={"scenario_id": other_scenario.id, "age_group": "under5"},
            context=self.context,
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("scenario_id", serializer.errors)

    def test_valid_with_optional_year_from_year_to(self):
        serializer = ImpactQuerySerializer(
            data={
                "scenario_id": self.scenario.id,
                "age_group": "under5",
                "year_from": 2025,
                "year_to": 2030,
            },
            context=self.context,
        )
        self.assertTrue(serializer.is_valid())
        self.assertEqual(serializer.validated_data["scenario"], self.scenario)
        self.assertEqual(serializer.validated_data["age_group"], "under5")
        self.assertEqual(serializer.validated_data["year_from"], 2025)
        self.assertEqual(serializer.validated_data["year_to"], 2030)

    def test_valid_without_year_from_year_to(self):
        serializer = ImpactQuerySerializer(
            data={"scenario_id": self.scenario.id, "age_group": "under5"},
            context=self.context,
        )
        self.assertTrue(serializer.is_valid())
        self.assertIsNone(serializer.validated_data.get("year_from"))
        self.assertIsNone(serializer.validated_data.get("year_to"))

    def test_year_from_greater_than_year_to_rejected(self):
        serializer = ImpactQuerySerializer(
            data={
                "scenario_id": self.scenario.id,
                "age_group": "under5",
                "year_from": 2030,
                "year_to": 2025,
            },
            context=self.context,
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("year_from", serializer.errors)

    def test_year_from_equals_year_to_valid(self):
        serializer = ImpactQuerySerializer(
            data={
                "scenario_id": self.scenario.id,
                "age_group": "under5",
                "year_from": 2025,
                "year_to": 2025,
            },
            context=self.context,
        )
        self.assertTrue(serializer.is_valid())


class ScenarioImpactSerializerTestCase(TestCase):
    def test_full_response_structure(self):
        """All fields including CI bounds are serialized."""
        metrics = ScenarioImpactMetrics(
            scenario_id=42,
            number_cases=_metric(100.0, 90.0, 110.0),
            number_severe_cases=_metric(10.0, 8.0, 12.0),
            prevalence_rate=_metric(0.05, 0.04, 0.06),
            direct_deaths=_metric(2.0, 1.5, 2.5),
            by_year=[
                YearImpactMetrics(
                    year=2025,
                    number_cases=_metric(50.0, 45.0, 55.0),
                    number_severe_cases=_metric(5.0, 4.0, 6.0),
                    prevalence_rate=_metric(0.06, 0.05, 0.07),
                    direct_deaths=_metric(1.0, 0.8, 1.2),
                    org_units=[
                        OrgUnitImpactMetrics(
                            org_unit_id=1,
                            org_unit_name="OU1",
                            number_cases=_metric(50.0, 45.0, 55.0),
                            number_severe_cases=_metric(5.0, 4.0, 6.0),
                            prevalence_rate=_metric(0.06, 0.05, 0.07),
                            direct_deaths=_metric(1.0, 0.8, 1.2),
                        ),
                    ],
                ),
            ],
            org_units=[
                OrgUnitImpactMetrics(
                    org_unit_id=1,
                    org_unit_name="OU1",
                    number_cases=_metric(100.0, 90.0, 110.0),
                    number_severe_cases=_metric(10.0, 8.0, 12.0),
                    prevalence_rate=_metric(0.05, 0.04, 0.06),
                    direct_deaths=_metric(2.0, 1.5, 2.5),
                ),
            ],
        )
        data = ScenarioImpactSerializer(metrics).data

        self.assertEqual(data["scenario_id"], 42)

        self._assert_metric(data["number_cases"], 100.0, 90.0, 110.0)
        self._assert_metric(data["number_severe_cases"], 10.0, 8.0, 12.0)
        self._assert_metric(data["prevalence_rate"], 0.05, 0.04, 0.06)
        self._assert_metric(data["direct_deaths"], 2.0, 1.5, 2.5)

        self.assertEqual(len(data["by_year"]), 1)
        year = data["by_year"][0]
        self.assertEqual(year["year"], 2025)
        self._assert_metric(year["number_cases"], 50.0, 45.0, 55.0)

        self.assertEqual(len(year["org_units"]), 1)
        ou_year = year["org_units"][0]
        self.assertEqual(ou_year["org_unit_id"], 1)
        self.assertEqual(ou_year["org_unit_name"], "OU1")
        self._assert_metric(ou_year["number_cases"], 50.0, 45.0, 55.0)

        self.assertEqual(len(data["org_units"]), 1)
        ou = data["org_units"][0]
        self.assertEqual(ou["org_unit_id"], 1)
        self.assertEqual(ou["org_unit_name"], "OU1")
        self._assert_metric(ou["number_cases"], 100.0, 90.0, 110.0)

    def test_empty_results(self):
        """No impact data matched: empty lists and all-None metrics are serialized cleanly."""
        metrics = ScenarioImpactMetrics(scenario_id=1, by_year=[], org_units=[])
        data = ScenarioImpactSerializer(metrics).data

        self.assertEqual(data["scenario_id"], 1)
        self.assertIsNone(data["number_cases"]["value"])
        self.assertIsNone(data["number_cases"]["lower"])
        self.assertIsNone(data["number_cases"]["upper"])
        self.assertEqual(data["by_year"], [])
        self.assertEqual(data["org_units"], [])

    def _assert_metric(self, metric_data, value, lower, upper):
        self.assertEqual(metric_data["value"], value)
        self.assertEqual(metric_data["lower"], lower)
        self.assertEqual(metric_data["upper"], upper)
