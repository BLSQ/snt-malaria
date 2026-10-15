from decimal import Decimal
from unittest.mock import patch

from django.contrib.gis.geos import Point
from rest_framework import status

from iaso.models import Account, DataSource, MetricType, MetricValue, OrgUnit, SourceVersion
from plugins.snt_malaria.models import InterventionAssignment, ScenarioRule, ScenarioRuleCostOverride
from plugins.snt_malaria.models.scenario_rule_cost_override import OVERRIDE_VALUE_FIELDS
from plugins.snt_malaria.permissions import SNT_SCENARIO_FULL_WRITE_PERMISSION
from plugins.snt_malaria.tests.common_base import SNTMalariaAPITestCase


BASE_URL = "/api/snt_malaria/scenario_rule_ai/"
RESTORE_URL = "/api/snt_malaria/scenario_rule_ai/restore/"


class ScenarioRuleAIOrgUnitsAndOverridesTestCase(SNTMalariaAPITestCase):
    """Hand-picked org units and per-intervention overrides (grant, deployment years, cost items),
    from the AI's rule spec to the persisted rule, and back into the context sent to the AI."""

    auto_create_account = False

    def setUp(self):
        super().setUp()
        source_version = SourceVersion.objects.create(data_source=DataSource.objects.create(name="source"), number=1)
        self.account = Account.objects.create(
            name="Test Account", anthropic_api_key="sk-test-key", default_version=source_version
        )
        self.user = self.create_user_with_profile(
            username="user", account=self.account, permissions=[SNT_SCENARIO_FULL_WRITE_PERMISSION]
        )
        self.scenario = self.create_snt_scenario(
            account=self.account, created_by=self.user, start_year=2025, end_year=2028
        )

        region = OrgUnit.objects.create(name="North", version=source_version)
        district_type = self.create_snt_org_unit_type()
        self.district_a, self.district_b, self.district_c = (
            self.create_snt_org_unit(
                org_unit_type=district_type,
                name=name,
                parent=region,
                version=source_version,
                validation_status=OrgUnit.VALIDATION_VALID,
                location=Point(1.0, 2.0, 0.0),
            )
            for name in ("District A", "District B", "District C")
        )

        self.metric_type = MetricType.objects.create(account=self.account, name="Incidence", code="incidence")
        for org_unit, value in ((self.district_a, 500), (self.district_b, 500), (self.district_c, 100)):
            MetricValue.objects.create(metric_type=self.metric_type, org_unit=org_unit, value=value)

        category = self.create_snt_intervention_category(account=self.account, created_by=self.user)
        self.intervention = self.create_snt_intervention(
            intervention_category=category, created_by=self.user, name="Bednets"
        )
        self.nets_line = self.create_snt_cost_line(
            self.intervention, name="Nets", is_proportional=True, unit_cost=Decimal("2.50")
        )
        self.campaign_line = self.create_snt_cost_line(self.intervention, name="Campaign", unit_cost=Decimal("5000"))
        self.grant = self.create_snt_grant(account=self.account, name="Global Fund GC7")

        self.client.force_authenticate(self.user)

    def _rule_spec(self, **overrides):
        return {
            "id": None,
            "name": "Bednets",
            "is_match_all": False,
            "matching_criteria": [{"metric_type": self.metric_type.id, "operator": ">", "value": 400}],
            "org_units_included": [],
            "org_units_excluded": [],
            "interventions": [self.intervention.id],
            "intervention_overrides": [],
            "color": None,
            **overrides,
        }

    def _cost_line_spec(self, cost_line, **values):
        return {"cost_line": cost_line.id, **dict.fromkeys(OVERRIDE_VALUE_FIELDS), "yearly_coverage": {}, **values}

    def _mock_result(self, rules=None):
        return {"assistant_message": "Done.", "rules": rules, "quick_replies": None, "conversation_history": []}

    def _generate(self, mock_gen, rules):
        mock_gen.return_value = self._mock_result(rules)
        return self.client.post(BASE_URL, {"scenario": self.scenario.id, "message": "go"}, format="json")

    def _assigned_org_unit_ids(self, rule):
        return set(InterventionAssignment.objects.filter(rule=rule).values_list("org_unit_id", flat=True))

    def _context_sent_for(self, mock_gen, rule):
        mock_gen.return_value = self._mock_result()
        self.client.post(BASE_URL, {"scenario": self.scenario.id, "message": "hi"}, format="json")
        return next(r for r in mock_gen.call_args.kwargs["current_rules"] if r["id"] == rule.id)

    @patch("plugins.snt_malaria.api.scenario_rule_ai.views.generate_scenario_rules")
    def test_match_all_with_exclusions_targets_every_org_unit_but_the_excluded_ones(self, mock_gen):
        response = self._generate(
            mock_gen,
            [self._rule_spec(is_match_all=True, matching_criteria=[], org_units_excluded=[self.district_b.id])],
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        rule = ScenarioRule.objects.get(scenario=self.scenario)
        self.assertIsNone(rule.matching_criteria)
        self.assertCountEqual(rule.org_units_included, [self.district_a.id, self.district_c.id])
        self.assertEqual(rule.org_units_excluded, [])
        self.assertEqual(self._assigned_org_unit_ids(rule), {self.district_a.id, self.district_c.id})

    @patch("plugins.snt_malaria.api.scenario_rule_ai.views.generate_scenario_rules")
    def test_criteria_rule_applies_hand_picked_org_units_and_drops_no_op_ones(self, mock_gen):
        """Excluding an unmatched org unit or including a matched one changes nothing, so it isn't stored."""
        response = self._generate(
            mock_gen,
            [
                self._rule_spec(
                    org_units_excluded=[self.district_b.id, self.district_c.id],
                    org_units_included=[self.district_c.id, self.district_a.id],
                )
            ],
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        rule = ScenarioRule.objects.get(scenario=self.scenario)
        self.assertEqual(rule.org_units_excluded, [self.district_b.id])
        self.assertEqual(rule.org_units_included, [self.district_c.id])
        self.assertEqual(self._assigned_org_unit_ids(rule), {self.district_a.id, self.district_c.id})

    @patch("plugins.snt_malaria.api.scenario_rule_ai.views.generate_scenario_rules")
    def test_rule_without_criteria_targets_only_its_hand_picked_org_units(self, mock_gen):
        response = self._generate(
            mock_gen, [self._rule_spec(matching_criteria=[], org_units_included=[self.district_c.id])]
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        rule = ScenarioRule.objects.get(scenario=self.scenario)
        self.assertIsNone(rule.matching_criteria)
        self.assertEqual(self._assigned_org_unit_ids(rule), {self.district_c.id})

    @patch("plugins.snt_malaria.api.scenario_rule_ai.views.generate_scenario_rules")
    def test_hand_picked_org_unit_outside_the_catalog_rejects_the_rule_set(self, mock_gen):
        response = self._generate(mock_gen, [self._rule_spec(org_units_included=[999_999])])

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(ScenarioRule.objects.filter(scenario=self.scenario).exists())

    @patch("plugins.snt_malaria.api.scenario_rule_ai.views.generate_scenario_rules")
    def test_intervention_overrides_set_grant_disabled_year_and_cost_item_values(self, mock_gen):
        response = self._generate(
            mock_gen,
            [
                self._rule_spec(
                    intervention_overrides=[
                        {
                            "intervention": self.intervention.id,
                            "grant": self.grant.id,
                            "deployment_years": [2025, 2026, 2028],
                            "cost_lines": [
                                self._cost_line_spec(self.nets_line, unit_cost=3.0, yearly_coverage={"2026": 50}),
                                self._cost_line_spec(self.campaign_line, coverage=2),
                            ],
                        }
                    ]
                )
            ],
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        rule = ScenarioRule.objects.get(scenario=self.scenario)
        rule_intervention = self.get_snt_rule_intervention(rule, self.intervention)
        self.assertEqual(rule_intervention.grant, self.grant)
        self.assertEqual(rule_intervention.deployment_years, [2025, 2026, 2028])
        overrides = ScenarioRuleCostOverride.objects.filter(rule_intervention=rule_intervention)
        self.assertEqual(overrides.get(cost_line=self.nets_line, year__isnull=True).unit_cost, Decimal("3.00"))
        self.assertEqual(overrides.get(cost_line=self.nets_line, year=2026).coverage, Decimal("50.00"))
        self.assertEqual(overrides.get(cost_line=self.campaign_line, year__isnull=True).coverage, Decimal("2.00"))
        self.assertEqual(
            set(InterventionAssignment.objects.filter(rule=rule).values_list("grant_id", flat=True)), {self.grant.id}
        )

    @patch("plugins.snt_malaria.api.scenario_rule_ai.views.generate_scenario_rules")
    def test_computed_override_values_are_rounded_to_the_stored_precision(self, mock_gen):
        """A relative change like "+10%" can yield 2.7500000000000004, which the override serializer would reject."""
        response = self._generate(
            mock_gen,
            [
                self._rule_spec(
                    intervention_overrides=[
                        {
                            "intervention": self.intervention.id,
                            "cost_lines": [
                                self._cost_line_spec(
                                    self.nets_line, unit_cost=2.5 * 1.1, yearly_coverage={"2027": 100 / 3}
                                )
                            ],
                        }
                    ]
                )
            ],
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        overrides = ScenarioRuleCostOverride.objects.filter(cost_line=self.nets_line)
        self.assertEqual(overrides.get(year__isnull=True).unit_cost, Decimal("2.75"))
        self.assertEqual(overrides.get(year=2027).coverage, Decimal("33.33"))

    @patch("plugins.snt_malaria.api.scenario_rule_ai.views.generate_scenario_rules")
    def test_yearly_coverage_outside_the_scenario_period_rejects_the_rule_set(self, mock_gen):
        response = self._generate(
            mock_gen,
            [
                self._rule_spec(
                    intervention_overrides=[
                        {
                            "intervention": self.intervention.id,
                            "cost_lines": [self._cost_line_spec(self.nets_line, yearly_coverage={"2031": 50})],
                        }
                    ]
                )
            ],
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(ScenarioRule.objects.filter(scenario=self.scenario).exists())

    @patch("plugins.snt_malaria.api.scenario_rule_ai.views.generate_scenario_rules")
    def test_override_for_an_intervention_outside_the_rule_rejects_the_rule_set(self, mock_gen):
        other_intervention = self.create_snt_intervention(
            intervention_category=self.intervention.intervention_category, created_by=self.user, name="IRS"
        )

        response = self._generate(
            mock_gen,
            [self._rule_spec(intervention_overrides=[{"intervention": other_intervention.id, "grant": self.grant.id}])],
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("plugins.snt_malaria.api.scenario_rule_ai.views.generate_scenario_rules")
    def test_overrides_left_out_of_an_updated_rule_are_reset(self, mock_gen):
        rule = self.create_snt_rule(
            self.scenario,
            interventions=[self.intervention],
            matching_criteria={"and": [{">": [{"var": self.metric_type.id}, 400]}]},
        )
        self.create_snt_rule_cost_override(rule, self.nets_line, unit_cost=Decimal("9"))

        response = self._generate(mock_gen, [self._rule_spec(id=rule.id)])

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(ScenarioRuleCostOverride.objects.filter(rule_intervention__scenario_rule=rule).exists())

    @patch("plugins.snt_malaria.api.scenario_rule_ai.views.generate_scenario_rules")
    def test_catalogs_and_scenario_period_are_sent_to_the_ai(self, mock_gen):
        self.intervention.grant = self.grant
        self.intervention.save()

        self._context_sent_for(mock_gen, self.create_snt_rule(self.scenario, interventions=[self.intervention]))

        kwargs = mock_gen.call_args.kwargs
        self.assertEqual(kwargs["scenario_years"], range(2025, 2029))
        self.assertEqual(
            kwargs["org_units"],
            [
                {"id": self.district_a.id, "name": "District A", "parent_name": "North"},
                {"id": self.district_b.id, "name": "District B", "parent_name": "North"},
                {"id": self.district_c.id, "name": "District C", "parent_name": "North"},
            ],
        )
        self.assertEqual([grant["name"] for grant in kwargs["grants"]], ["Global Fund GC7"])
        [intervention] = mock_gen.call_args.args[3]
        self.assertEqual(intervention["grant_name"], "Global Fund GC7")
        self.assertEqual([line["name"] for line in intervention["cost_lines"]], ["Nets", "Campaign"])

    @patch("plugins.snt_malaria.api.scenario_rule_ai.views.generate_scenario_rules")
    def test_context_shows_rule_without_criteria_missing_few_org_units_as_match_all_with_exclusions(self, mock_gen):
        rule = self.create_snt_rule(
            self.scenario,
            interventions=[self.intervention],
            matching_criteria=None,
            org_units_included=[self.district_a.id, self.district_c.id],
        )

        sent_rule = self._context_sent_for(mock_gen, rule)

        self.assertTrue(sent_rule["is_match_all"])
        self.assertEqual(sent_rule["org_units_included"], [])
        self.assertEqual(sent_rule["org_units_excluded"], [self.district_b.id])

    @patch("plugins.snt_malaria.api.scenario_rule_ai.views.generate_scenario_rules")
    def test_context_shows_rule_without_criteria_with_few_org_units_as_hand_picked(self, mock_gen):
        rule = self.create_snt_rule(
            self.scenario,
            interventions=[self.intervention],
            matching_criteria=None,
            org_units_included=[self.district_c.id],
        )

        sent_rule = self._context_sent_for(mock_gen, rule)

        self.assertFalse(sent_rule["is_match_all"])
        self.assertEqual(sent_rule["org_units_included"], [self.district_c.id])

    @patch("plugins.snt_malaria.api.scenario_rule_ai.views.generate_scenario_rules")
    def test_context_includes_intervention_overrides(self, mock_gen):
        rule = self.create_snt_rule(
            self.scenario,
            interventions=[self.intervention],
            matching_criteria={"and": [{">": [{"var": self.metric_type.id}, 400]}]},
        )
        self.create_snt_rule_cost_override(rule, self.nets_line, year=2026, coverage=Decimal("40"))

        sent_rule = self._context_sent_for(mock_gen, rule)

        self.assertEqual(
            sent_rule["intervention_overrides"],
            [
                {
                    "intervention": self.intervention.id,
                    "deployment_years": None,
                    "grant": None,
                    "cost_lines": [
                        {
                            "cost_line": self.nets_line.id,
                            "unit_cost": None,
                            "conversion_factor": None,
                            "buffer": None,
                            "coverage": None,
                            "yearly_coverage": {"2026": 40.0},
                        }
                    ],
                }
            ],
        )

    def test_restore_brings_back_overrides_and_hand_picked_org_units(self):
        response = self.client.post(
            RESTORE_URL,
            {
                "scenario": self.scenario.id,
                "rules": [
                    self._rule_spec(
                        org_units_excluded=[self.district_b.id],
                        intervention_overrides=[
                            {
                                "intervention": self.intervention.id,
                                "grant": self.grant.id,
                                "deployment_years": [2025],
                                "cost_lines": [self._cost_line_spec(self.campaign_line, coverage=4)],
                            }
                        ],
                    )
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        rule = ScenarioRule.objects.get(scenario=self.scenario)
        self.assertEqual(rule.org_units_excluded, [self.district_b.id])
        rule_intervention = self.get_snt_rule_intervention(rule, self.intervention)
        self.assertEqual(rule_intervention.grant, self.grant)
        self.assertEqual(rule_intervention.deployment_years, [2025])
        self.assertEqual(rule_intervention.cost_overrides.get().coverage, Decimal("4.00"))
