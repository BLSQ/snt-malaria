from decimal import Decimal

from rest_framework import status

from plugins.snt_malaria.models import ScenarioRuleCostOverride, ScenarioRuleIntervention
from plugins.snt_malaria.tests.api.scenario_rules.common_base import ScenarioRulesTestBase


class ScenarioRuleInterventionOverridesAPITestCase(ScenarioRulesTestBase):
    BASE_URL = "/api/snt_malaria/scenario_rules/"

    def setUp(self):
        super().setUp()
        self.population_line = self.create_snt_cost_line(
            self.intervention_chemo_smc,
            name="SMC drugs",
            is_proportional=True,
            population_layer=self.metric_type_pop_under_5,
        )
        self.fixed_line = self.create_snt_cost_line(self.intervention_chemo_smc, name="SMC training")
        self.grant = self.create_snt_grant(name="Rule grant")
        self.client.force_authenticate(user=self.user_with_full_perm)

    def _smc_overrides(self, **changes):
        return {
            "intervention": self.intervention_chemo_smc.id,
            "deployment_years": [2021, 2022],
            "grant": self.grant.id,
            "cost_lines": [
                {
                    "cost_line": self.population_line.id,
                    "unit_cost": 3,
                    "coverage": 80,
                    "yearly_coverage": {"2022": 50},
                },
                {"cost_line": self.fixed_line.id, "yearly_coverage": {"2021": 0}},
            ],
            **changes,
        }

    def _patch(self, payload, rule=None):
        return self.client.patch(f"{self.BASE_URL}{(rule or self.scenario_rule_1).id}/", payload)

    def _smc_rule_intervention(self, rule=None):
        return ScenarioRuleIntervention.objects.get(
            scenario_rule=rule or self.scenario_rule_1, intervention=self.intervention_chemo_smc
        )

    def test_patch_saves_intervention_overrides_and_returns_them_grouped(self):
        response = self._patch({"intervention_overrides": [self._smc_overrides()]})
        result = self.assertJSONResponse(response, status.HTTP_200_OK)

        rule_intervention = self._smc_rule_intervention()
        self.assertEqual(rule_intervention.deployment_years, [2021, 2022])
        self.assertEqual(rule_intervention.grant, self.grant)
        overrides = ScenarioRuleCostOverride.objects.filter(rule_intervention=rule_intervention)
        self.assertCountEqual(
            overrides.values_list("cost_line_id", "year", "unit_cost", "coverage"),
            [
                (self.population_line.id, None, Decimal("3.00"), Decimal("80.00")),
                (self.population_line.id, 2022, None, Decimal("50.00")),
                (self.fixed_line.id, 2021, None, Decimal("0.00")),
            ],
        )

        self.assertEqual(
            result["intervention_overrides"],
            [
                {
                    "intervention": self.intervention_chemo_smc.id,
                    "deployment_years": [2021, 2022],
                    "grant": self.grant.id,
                    "cost_lines": [
                        {
                            "cost_line": self.population_line.id,
                            "unit_cost": 3.0,
                            "conversion_factor": None,
                            "buffer": None,
                            "coverage": 80.0,
                            "yearly_coverage": {"2022": 50.0},
                        },
                        {
                            "cost_line": self.fixed_line.id,
                            "unit_cost": None,
                            "conversion_factor": None,
                            "buffer": None,
                            "coverage": None,
                            "yearly_coverage": {"2021": 0.0},
                        },
                    ],
                }
            ],
        )

    def _create_smc_rule(self, **payload):
        return self.client.post(
            self.BASE_URL,
            {
                "scenario": self.scenario.id,
                "name": "New rule",
                "color": "#123456",
                "interventions": [self.intervention_chemo_smc.id],
                "matching_criteria": None,
                "org_units_included": [self.district_1.id],
                **payload,
            },
        )

    def test_rule_grant_override_is_set_on_its_assignments(self):
        self._create_smc_rule(intervention_overrides=[self._smc_overrides()])

        smc_assignments = self.scenario.intervention_assignments.filter(intervention=self.intervention_chemo_smc)
        self.assertTrue(smc_assignments.exists())
        self.assertEqual(set(smc_assignments.values_list("grant_id", flat=True)), {self.grant.id})

    def test_deployment_years_covering_the_whole_scenario_are_stored_as_every_year(self):
        every_year = list(range(self.scenario.start_year, self.scenario.end_year + 1))

        self._patch({"intervention_overrides": [self._smc_overrides(deployment_years=every_year)]})

        self.assertIsNone(self._smc_rule_intervention().deployment_years)

    def test_patch_without_intervention_overrides_keeps_existing_ones(self):
        self._patch({"intervention_overrides": [self._smc_overrides()]})

        response = self._patch({"name": "Renamed"})

        self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertEqual(self._smc_rule_intervention().deployment_years, [2021, 2022])
        self.assertEqual(ScenarioRuleCostOverride.objects.count(), 3)

    def test_patch_with_empty_intervention_overrides_resets_the_rule_to_defaults(self):
        self._patch({"intervention_overrides": [self._smc_overrides()]})

        response = self._patch({"intervention_overrides": []})

        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        rule_intervention = self._smc_rule_intervention()
        self.assertIsNone(rule_intervention.deployment_years)
        self.assertIsNone(rule_intervention.grant)
        self.assertFalse(ScenarioRuleCostOverride.objects.exists())
        self.assertEqual(result["intervention_overrides"], [])

    def test_removing_an_intervention_deletes_its_overrides(self):
        self._patch({"intervention_overrides": [self._smc_overrides()]})

        response = self._patch({"interventions": [self.intervention_vaccination_rts.id]})

        self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertFalse(ScenarioRuleCostOverride.objects.exists())

    def test_create_rule_with_intervention_overrides(self):
        response = self._create_smc_rule(intervention_overrides=[self._smc_overrides()])

        result = self.assertJSONResponse(response, status.HTTP_201_CREATED)
        self.assertEqual(result["intervention_overrides"][0]["deployment_years"], [2021, 2022])
        self.assertEqual(ScenarioRuleCostOverride.objects.count(), 3)

    def test_invalid_intervention_overrides_are_rejected(self):
        other_line = self.create_snt_cost_line(self.intervention_chemo_iptp, name="IPTp drugs")
        other_grant = self.create_snt_grant(account=self.other_account, name="Other grant")
        population_line_entry = {"cost_line": self.population_line.id}
        cases = {
            "intervention not in the rule": {"intervention": self.intervention_chemo_iptp.id, "cost_lines": []},
            "cost item of another intervention": self._smc_overrides(cost_lines=[{"cost_line": other_line.id}]),
            "deployment year outside the scenario": self._smc_overrides(deployment_years=[2019]),
            "coverage year outside the scenario": self._smc_overrides(
                cost_lines=[{**population_line_entry, "yearly_coverage": {"2031": 50}}]
            ),
            "coverage above 100": self._smc_overrides(cost_lines=[{**population_line_entry, "coverage": 120}]),
            "conversion factor on a fixed cost item": self._smc_overrides(
                cost_lines=[{"cost_line": self.fixed_line.id, "conversion_factor": 2}]
            ),
            "yearly coverage above 100": self._smc_overrides(
                cost_lines=[{**population_line_entry, "yearly_coverage": {"2021": 101}}]
            ),
            "same cost item twice": self._smc_overrides(cost_lines=[population_line_entry, population_line_entry]),
            "grant of another account": self._smc_overrides(grant=other_grant.id),
        }
        for case, intervention_override in cases.items():
            with self.subTest(case):
                response = self._patch({"intervention_overrides": [intervention_override]})

                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn("intervention_overrides", response.json())
        self.assertFalse(ScenarioRuleCostOverride.objects.exists())

    def test_fixed_cost_item_takes_quantities_above_100(self):
        fixed_line_entry = {"cost_line": self.fixed_line.id, "coverage": 250, "yearly_coverage": {"2021": 400}}

        response = self._patch({"intervention_overrides": [self._smc_overrides(cost_lines=[fixed_line_entry])]})

        self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertCountEqual(
            ScenarioRuleCostOverride.objects.values_list("year", "coverage"),
            [(None, Decimal("250.00")), (2021, Decimal("400.00"))],
        )

    def test_locked_scenario_rejects_intervention_overrides(self):
        self.lock_scenario(self.scenario)

        response = self._patch({"intervention_overrides": [self._smc_overrides()]})

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(ScenarioRuleCostOverride.objects.exists())
