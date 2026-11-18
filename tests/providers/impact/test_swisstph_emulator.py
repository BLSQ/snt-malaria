import importlib.util
import types

from unittest import skipUnless
from unittest.mock import patch

import pandas as pd

from django.test import SimpleTestCase

from plugins.snt_malaria.providers.impact.base import (
    ImpactMetricWithConfidenceInterval,
    IncompleteConfigError,
    InterventionMappingError,
    OrgUnitRef,
)
from plugins.snt_malaria.providers.impact.swisstph_emulator import SwissTPHEmulatorImpactProvider


_LOAD_PATCH = "plugins.snt_malaria.providers.impact.swisstph_emulator._load_emulator"
_VERSION_PATCH = "plugins.snt_malaria.providers.impact.swisstph_emulator.metadata.version"
_INTERVENTIONS = ["IG2", "PBO", "STD", "SMC", "PMC", "RTSS", "IRS"]
_EIR_FACTORS = {"EIR_lci": 0.5, "EIR_mean": 1.0, "EIR_uci": 1.5}
_AVERTED_TARGETS = [
    {"output": "incidence", "averted": "averted"},
    {"output": "uncomplicated", "averted": "averted"},
    {"output": "severe", "averted": "averted"},
    {"output": "prevalence", "averted": "reduction"},
]


def _norm_name(name):
    return name.lower().replace("-", " ").strip()


class FakeEmulator:
    def __init__(self, targets=None):
        self.districts = ["garoua 1", "garoua 2"]
        self.interventions = _INTERVENTIONS
        self.meta = {
            "targets": targets if targets is not None else _AVERTED_TARGETS,
            "years": [2026, 2027, 2028, 2029, 2030],
            "age_groups": ["0-5", "5-10", "0-100"],
        }
        self.predict_calls = []

    def predict(self, districts, years=None, ages=None, eir=None, **coverages):
        self.predict_calls.append({"districts": districts, "years": years, "ages": ages, "eir": eir, **coverages})
        rows = []
        for district in districts:
            for year in years:
                for level in eir:
                    factor = _EIR_FACTORS[level]
                    rows.append(
                        {
                            "district": district,
                            "EIR_CI": level,
                            "age_group": ages[0],
                            "year": year,
                            "incidence": 0.5625 * factor,
                            "uncomplicated": 0.5 * factor,
                            "severe": 0.0625 * factor,
                            "prevalence": 0.25 * factor,
                            "population": 1000.0 + year - 2026,
                        }
                    )
        return pd.DataFrame(rows)


class MockIntervention:
    def __init__(self, impact_ref=""):
        self.impact_ref = impact_ref

    def __str__(self):
        return self.impact_ref


class MockOrgUnit:
    def __init__(self, id, name, impact_reference=None):
        self.id = id
        self.name = name
        if impact_reference is not None:
            self.impact_mapping = types.SimpleNamespace(reference=impact_reference)


def _build_provider(config=None, emulator=None):
    emulator = emulator or FakeEmulator()
    with patch(_LOAD_PATCH, return_value=(emulator, _norm_name)):
        provider = SwissTPHEmulatorImpactProvider(config_id=0, config=config or {}, secret="")
    return provider, emulator


class SwissTPHEmulatorConfigTests(SimpleTestCase):
    def test_missing_emulator_package_raises_incomplete_config(self):
        with patch(_LOAD_PATCH, side_effect=ImportError("No module named cmr_emulator")):
            with self.assertRaises(IncompleteConfigError):
                SwissTPHEmulatorImpactProvider(config_id=0, config={}, secret="")

    def test_bundle_without_population_or_case_outputs_raises_incomplete_config(self):
        prevalence_only = FakeEmulator(targets=[{"output": "prevalence"}, {"output": "incidence"}])
        with self.assertRaises(IncompleteConfigError):
            _build_provider(emulator=prevalence_only)

    def test_configured_bundle_is_loaded(self):
        with patch(_LOAD_PATCH, return_value=(FakeEmulator(), _norm_name)) as load:
            SwissTPHEmulatorImpactProvider(config_id=0, config={"bundle": "v8_av"}, secret="")
        load.assert_called_once_with("v8_av")

    def test_coverage_for_unknown_intervention_raises_incomplete_config(self):
        with self.assertRaises(IncompleteConfigError):
            _build_provider(config={"coverage": {"LSM": 0.5}})

    def test_coverage_outside_unit_interval_raises_incomplete_config(self):
        for value in (1.5, -0.1, "0.5"):
            with self.subTest(value=value), self.assertRaises(IncompleteConfigError):
                _build_provider(config={"coverage": {"SMC": value}})


class SwissTPHEmulatorMetadataTests(SimpleTestCase):
    def setUp(self):
        self.provider, _ = _build_provider()

    def test_year_range_spans_emulated_years(self):
        self.assertEqual(self.provider.get_year_range(), (2026, 2030))

    def test_age_groups_are_sorted(self):
        self.assertEqual(self.provider.get_age_groups(), ["0-100", "0-5", "5-10"])

    def test_meta_annotates_case_metrics_as_all_cases(self):
        with patch(_VERSION_PATCH, return_value="0.1.0"):
            annotations = self.provider.get_meta().metric_annotations

        self.assertEqual(
            {metric: str(text) for metric, text in annotations.items()},
            {
                "number_cases": "All malaria cases (uncomplicated + severe)",
                "number_uncomplicated_cases": "All uncomplicated malaria cases",
            },
        )

    def test_meta_reports_the_installed_emulator_version(self):
        with patch(_VERSION_PATCH, return_value="0.1.0") as version:
            meta = self.provider.get_meta()

        version.assert_called_once_with("cmr-emulator")
        self.assertEqual(meta.provider_key, "swisstph_emulator")
        self.assertEqual(meta.version, "0.1.0")

    def test_available_impact_refs_are_emulator_interventions_plus_cm(self):
        refs = [option.ref for option in self.provider.get_available_impact_refs()]
        self.assertEqual(refs, ["CM", "IG2", "IRS", "PBO", "PMC", "RTSS", "SMC", "STD"])


class SwissTPHEmulatorMapInterventionTests(SimpleTestCase):
    def setUp(self):
        self.provider, _ = _build_provider()

    def test_emulator_intervention_maps_to_itself(self):
        self.assertEqual(self.provider._map_intervention(MockIntervention("SMC")), {"SMC"})

    def test_cm_maps_to_no_emulator_intervention(self):
        self.assertEqual(self.provider._map_intervention(MockIntervention("CM")), set())

    def test_empty_or_unknown_impact_ref_raises(self):
        for impact_ref in ("", "   ", "LSM", "deployed_int_smc"):
            with self.subTest(impact_ref=impact_ref), self.assertRaises(InterventionMappingError):
                self.provider._map_intervention(MockIntervention(impact_ref))


class SwissTPHEmulatorMatchImpactBulkTests(SimpleTestCase):
    def test_deployed_interventions_get_coverage_and_others_get_zero(self):
        """IG2 has a non-zero emulator default, so it must be passed as 0 when not deployed."""
        provider, emulator = _build_provider(config={"coverage": {"SMC": 0.9}})

        provider.match_impact_bulk(
            [MockOrgUnit(1, "Garoua 1")],
            [MockIntervention("SMC"), MockIntervention("PMC"), MockIntervention("CM")],
            "0-5",
        )

        call = emulator.predict_calls[0]
        self.assertEqual(
            {name: call[name] for name in _INTERVENTIONS},
            {"IG2": 0.0, "PBO": 0.0, "STD": 0.0, "SMC": 0.9, "PMC": 0.8, "RTSS": 0.0, "IRS": 0.0},
        )
        self.assertEqual(call["ages"], ["0-5"])
        self.assertEqual(call["eir"], ["EIR_mean", "EIR_lci", "EIR_uci"])

    def test_results_scale_rates_by_population_with_eir_bands_as_confidence_interval(self):
        provider, _ = _build_provider()

        bulk = provider.match_impact_bulk([MockOrgUnit(1, "Garoua 1")], [MockIntervention("IG2")], "0-5", 2027, 2027)

        [result] = bulk.results[1]
        self.assertEqual(result.year, 2027)
        self.assertEqual(result.population, 1001.0)
        self.assertEqual(result.number_cases, ImpactMetricWithConfidenceInterval(563.0625, 281.53125, 844.59375))
        self.assertEqual(result.number_uncomplicated_cases, ImpactMetricWithConfidenceInterval(500.5, 250.25, 750.75))
        self.assertEqual(result.number_severe_cases, ImpactMetricWithConfidenceInterval(62.5625, 31.28125, 93.84375))
        self.assertEqual(result.prevalence_rate, ImpactMetricWithConfidenceInterval(0.25, 0.125, 0.375))
        self.assertEqual(result.direct_deaths, ImpactMetricWithConfidenceInterval())

    def test_custom_eir_levels_are_used_for_bands(self):
        provider, emulator = _build_provider(
            config={"eir_ci_mean": "EIR_uci", "eir_ci_lower": "EIR_mean", "eir_ci_upper": "EIR_uci"}
        )

        bulk = provider.match_impact_bulk([MockOrgUnit(1, "Garoua 1")], [], "0-5", 2026, 2026)

        self.assertEqual(emulator.predict_calls[0]["eir"], ["EIR_uci", "EIR_mean"])
        self.assertEqual(bulk.results[1][0].prevalence_rate, ImpactMetricWithConfidenceInterval(0.375, 0.25, 0.375))

    def test_one_result_per_year_within_requested_range(self):
        provider, emulator = _build_provider()

        bulk = provider.match_impact_bulk([MockOrgUnit(1, "Garoua 1")], [], "0-100", 2027, 2029)

        self.assertEqual([result.year for result in bulk.results[1]], [2027, 2028, 2029])
        self.assertEqual(emulator.predict_calls[0]["years"], [2027, 2028, 2029])

    def test_year_range_outside_emulated_years_skips_prediction(self):
        provider, emulator = _build_provider()

        bulk = provider.match_impact_bulk([MockOrgUnit(1, "Garoua 1")], [], "0-5", 2031, 2035)

        self.assertEqual(bulk.results, {})
        self.assertEqual(emulator.predict_calls, [])

    def test_unknown_age_group_returns_no_results_without_prediction(self):
        provider, emulator = _build_provider()

        bulk = provider.match_impact_bulk([MockOrgUnit(1, "Garoua 1")], [], "under5")

        self.assertEqual(bulk.results, {})
        self.assertEqual(emulator.predict_calls, [])

    def test_org_units_match_by_mapping_reference_or_normalised_name(self):
        provider, emulator = _build_provider()
        org_units = [MockOrgUnit(1, "GAROUA-1"), MockOrgUnit(2, "Some name", impact_reference="Garoua 2")]

        bulk = provider.match_impact_bulk(org_units, [], "0-5")

        self.assertEqual(set(bulk.results), {1, 2})
        self.assertEqual(emulator.predict_calls[0]["districts"], ["garoua 1", "garoua 2"])

    def test_unknown_districts_are_reported_and_not_predicted(self):
        provider, emulator = _build_provider()
        org_units = [MockOrgUnit(1, "Garoua 1"), MockOrgUnit(3, "Atlantis")]

        bulk = provider.match_impact_bulk(org_units, [], "0-5")

        self.assertEqual(set(bulk.results), {1})
        self.assertEqual(bulk.warnings.org_units_not_found, [OrgUnitRef(id=3, name="Atlantis")])
        self.assertEqual(bulk.warnings.org_units_with_unmatched_interventions, [])
        self.assertEqual(emulator.predict_calls[0]["districts"], ["garoua 1"])

    def test_only_unknown_districts_skips_prediction(self):
        provider, emulator = _build_provider()

        bulk = provider.match_impact_bulk([MockOrgUnit(3, "Atlantis")], [], "0-5")

        self.assertEqual(bulk.results, {})
        self.assertEqual(len(bulk.warnings.org_units_not_found), 1)
        self.assertEqual(emulator.predict_calls, [])

    def test_match_impact_returns_results_for_single_org_unit(self):
        provider, _ = _build_provider()

        match = provider.match_impact(MockOrgUnit(1, "Garoua 1"), [MockIntervention("IG2")], "0-5", 2026, 2026)

        self.assertEqual([result.year for result in match.results], [2026])


@skipUnless(importlib.util.find_spec("cmr_emulator"), "cmr_emulator is not installed")
class SwissTPHEmulatorRealPackageTests(SimpleTestCase):
    def test_garoua_prediction_is_plausible(self):
        provider = SwissTPHEmulatorImpactProvider(config_id=0, config={"coverage": {"SMC": 0.9}}, secret="")

        bulk = provider.match_impact_bulk(
            [MockOrgUnit(1, "Garoua-1")], [MockIntervention("IG2"), MockIntervention("SMC")], "0-5", 2026, 2026
        )

        [result] = bulk.results[1]
        self.assertGreater(result.population, 0)
        self.assertLess(result.prevalence_rate.lower, result.prevalence_rate.value)
        self.assertLess(result.prevalence_rate.value, result.prevalence_rate.upper)
        self.assertAlmostEqual(result.prevalence_rate.value, 0.09, delta=0.02)
