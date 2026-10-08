from decimal import Decimal
from importlib import import_module

from django.db import IntegrityError, transaction

from plugins.snt_malaria.api.scenarios.utils import duplicate_rules
from plugins.snt_malaria.models import ScenarioRuleCostOverride, ScenarioRuleIntervention
from plugins.snt_malaria.tests.common_base import SNTMalariaTestCase


yearly_coverages_from_legacy = import_module(
    "plugins.snt_malaria.migrations.0066_migrate_yearly_cost_assignments_to_rule_overrides"
).yearly_coverages_from_legacy


class ScenarioRuleCostOverrideTestCase(SNTMalariaTestCase):
    def setUp(self):
        super().setUp()
        self.scenario = self.create_snt_scenario(start_year=2025, end_year=2027)
        self.intervention = self.create_snt_intervention()
        self.cost_line = self.create_snt_cost_line(self.intervention)
        self.rule = self.create_snt_rule(self.scenario, [self.intervention])

    def test_one_all_years_row_per_rule_intervention_and_cost_line(self):
        self.create_snt_rule_cost_override(self.rule, self.cost_line, unit_cost=Decimal("2"))

        with transaction.atomic(), self.assertRaises(IntegrityError):
            self.create_snt_rule_cost_override(self.rule, self.cost_line, unit_cost=Decimal("3"))

    def test_one_row_per_rule_intervention_cost_line_and_year(self):
        self.create_snt_rule_cost_override(self.rule, self.cost_line, year=2025, coverage=Decimal("50"))
        self.create_snt_rule_cost_override(self.rule, self.cost_line, year=2026, coverage=Decimal("50"))

        with transaction.atomic(), self.assertRaises(IntegrityError):
            self.create_snt_rule_cost_override(self.rule, self.cost_line, year=2025, coverage=Decimal("60"))

    def test_refresh_assignments_sets_the_rule_grant_on_assignments(self):
        org_unit = self.create_snt_org_unit()
        self.rule.org_units_included = [org_unit.id]
        self.rule.save()
        grant = self.create_snt_grant()
        ScenarioRuleIntervention.objects.filter(scenario_rule=self.rule).update(grant=grant)

        self.scenario.refresh_assignments(self.user)

        self.assertEqual(list(self.scenario.intervention_assignments.values_list("grant_id", flat=True)), [grant.id])

    def test_duplicate_rules_copies_deployment_years_grant_and_cost_overrides(self):
        grant = self.create_snt_grant()
        ScenarioRuleIntervention.objects.filter(scenario_rule=self.rule).update(deployment_years=[2026], grant=grant)
        self.create_snt_rule_cost_override(self.rule, self.cost_line, unit_cost=Decimal("2"))
        self.create_snt_rule_cost_override(self.rule, self.cost_line, year=2026, coverage=Decimal("40"))
        copy = self.create_snt_scenario(start_year=2025, end_year=2027)

        duplicate_rules(self.scenario, copy, self.user)

        copied_rule_intervention = ScenarioRuleIntervention.objects.get(scenario_rule__scenario=copy)
        self.assertEqual(copied_rule_intervention.deployment_years, [2026])
        self.assertEqual(copied_rule_intervention.grant, grant)
        self.assertCountEqual(
            ScenarioRuleCostOverride.objects.filter(rule_intervention=copied_rule_intervention).values_list(
                "year", "unit_cost", "coverage"
            ),
            [(None, Decimal("2.00"), None), (2026, None, Decimal("40.00"))],
        )

    def test_legacy_proportional_values_become_coverage_percentages_within_the_scenario(self):
        coverages = yearly_coverages_from_legacy(
            True, {2025: Decimal("0.85"), 2026: Decimal("1.2"), 2030: Decimal("0.5")}, 2025, 2027
        )

        self.assertEqual(coverages, {2025: Decimal("85.00"), 2026: Decimal("100")})

    def test_legacy_fixed_values_become_yearly_quantities_for_every_scenario_year(self):
        coverages = yearly_coverages_from_legacy(False, {2025: Decimal("3"), 2026: Decimal("0")}, 2025, 2027)

        self.assertEqual(coverages, {2025: Decimal("3"), 2026: Decimal("0"), 2027: Decimal("0")})
