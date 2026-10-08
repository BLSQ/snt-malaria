from decimal import Decimal

from iaso.models import MetricType, MetricValue
from plugins.snt_malaria.models import (
    BudgetSettings,
    InterventionAssignment,
    InterventionCostBreakdownLine,
    ScenarioRuleCostOverride,
)
from plugins.snt_malaria.models.cost_unit_type import CostUnitType
from plugins.snt_malaria.services import BudgetCalculationService
from plugins.snt_malaria.tests.common_base import SNTMalariaTestCase


class BudgetCalculationServiceTestCase(SNTMalariaTestCase):
    def setUp(self):
        super().setUp()

        self.scenario = self.create_snt_scenario(self.account, self.user, start_year=2025, end_year=2026)
        defaults = self.create_snt_default_interventions_setup(
            scenario=self.scenario,
            account=self.account,
            created_by=self.user,
        )

        self.intervention_smc = defaults["intervention_smc"]
        self.intervention_iptp = defaults["intervention_iptp"]
        self.district_1 = defaults["district_1"]
        self.district_2 = defaults["district_2"]

        # Ensure SMC is assigned to both districts for predictable two-org-unit totals.
        self.create_snt_assignment(self.scenario, self.district_1, self.intervention_smc, created_by=self.user)
        self.rule = self.create_snt_rule(self.scenario, [self.intervention_smc])
        InterventionAssignment.objects.filter(intervention=self.intervention_smc).update(rule=self.rule)

        self.metric_population = MetricType.objects.create(
            account=self.account,
            name="Population",
            code="POPULATION",
            description="Population",
            units="people",
        )
        self.metric_under_5 = MetricType.objects.create(
            account=self.account,
            name="Under 5",
            code="POP_UNDER_5",
            description="Under 5",
            units="children",
        )

        self.unit_type = CostUnitType.objects.create(
            account=self.account,
            name="per child",
        )

        BudgetSettings.objects.create(
            account=self.account,
            local_currency="USD",
            exchange_rate=Decimal("1"),
            inflation_rate=Decimal("0.03"),
        )

        self.population_line = InterventionCostBreakdownLine.objects.create(
            intervention=self.intervention_smc,
            name="SMC procurement",
            category=InterventionCostBreakdownLine.InterventionCostBreakdownLineCategory.PROCUREMENT,
            unit_type=self.unit_type,
            population_layer=self.metric_under_5,
            is_proportional=True,
            conversion_factor=Decimal("0.5"),
            unit_cost=Decimal("2.00"),
            created_by=self.user,
        )

        # Missing population layer should contribute zero.
        self.no_population_layer_line = InterventionCostBreakdownLine.objects.create(
            intervention=self.intervention_iptp,
            name="IPTp no layer",
            category=InterventionCostBreakdownLine.InterventionCostBreakdownLineCategory.PROCUREMENT,
            unit_type=self.unit_type,
            population_layer=None,
            is_proportional=True,
            unit_cost=Decimal("10.00"),
            created_by=self.user,
        )

        MetricValue.objects.create(
            metric_type=self.metric_under_5,
            org_unit=self.district_1,
            year=2025,
            value=Decimal("1000"),
        )
        MetricValue.objects.create(
            metric_type=self.metric_under_5,
            org_unit=self.district_2,
            year=2025,
            value=Decimal("2000"),
        )
        MetricValue.objects.create(
            metric_type=self.metric_under_5,
            org_unit=self.district_1,
            year=2026,
            value=Decimal("1500"),
        )
        MetricValue.objects.create(
            metric_type=self.metric_under_5,
            org_unit=self.district_2,
            year=2026,
            value=Decimal("2500"),
        )

        # For year 2025 only: 60% coverage. Year 2026 falls back to the line's 100%.
        self.create_snt_rule_cost_override(self.rule, self.population_line, year=2025, coverage=Decimal("60"))

    def test_calculate_year_applies_formula_and_aggregates(self):
        service = BudgetCalculationService(self.scenario)

        result = service.calculate_year(2025)

        # quantity includes the buffer(1.1); cost = quantity * unit_cost(2.0)
        # district_1 = 330 * 2 = 660, district_2 = 660 * 2 = 1320, total = 1980
        self.assertEqual(result.total_cost, 1980.0)

        self.assertEqual(len(result.interventions), 1)
        intervention = result.interventions[0]
        self.assertEqual(intervention.code, "smc")
        self.assertEqual(intervention.total_cost, 1980.0)
        self.assertEqual(len(intervention.cost_breakdown), 1)
        breakdown = intervention.cost_breakdown[0]
        self.assertEqual(breakdown.category, "Procurement")
        self.assertEqual(breakdown.total_cost, 1980.0)
        # quantity includes the buffer: district_1(300 * 1.1) + district_2(600 * 1.1) = 990
        self.assertEqual(breakdown.quantity, 990.0)
        # population = district_1(1000) + district_2(2000) = 3000
        self.assertEqual(breakdown.population, 3000.0)

        self.assertEqual(len(result.org_units_costs), 2)
        district_1_result = result.org_units_costs[0]
        district_2_result = result.org_units_costs[1]

        self.assertEqual(district_1_result.total_cost, 660.0)
        self.assertEqual(district_2_result.total_cost, 1320.0)

        self.assertEqual(len(result.category_costs), 1)
        self.assertEqual(result.category_costs[0].category, "Procurement")
        self.assertEqual(result.category_costs[0].quantity, 990.0)
        self.assertEqual(result.category_costs[0].total_cost, 1980.0)

    def test_quantity_includes_configured_buffer(self):
        BudgetSettings.objects.filter(account=self.account).update(inflation_rate=Decimal("0"), buffer=Decimal("1.25"))
        service = BudgetCalculationService(self.scenario)

        result = service.calculate_year(2025)

        breakdown = result.interventions[0].cost_breakdown[0]
        # quantity = (district_1(1000) + district_2(2000)) * coverage(0.6) * factor(0.5) * buffer(1.25) = 1125
        self.assertEqual(breakdown.quantity, 1125.0)
        # total_cost = 1125 * unit_cost(2.0) = 2250 (buffer already in quantity, no inflation)
        self.assertEqual(breakdown.total_cost, 2250.0)

    def test_cost_line_buffer_overrides_configured_buffer(self):
        BudgetSettings.objects.filter(account=self.account).update(inflation_rate=Decimal("0"), buffer=Decimal("1.25"))
        self.population_line.buffer = Decimal("10")
        self.population_line.save()
        service = BudgetCalculationService(self.scenario)

        result = service.calculate_year(2025)

        breakdown = result.interventions[0].cost_breakdown[0]
        # quantity = 3000 * coverage(0.6) * factor(0.5) * line buffer(1 + 10%) = 990
        self.assertEqual(breakdown.quantity, 990.0)
        self.assertEqual(breakdown.total_cost, 1980.0)
        self.assertEqual(breakdown.buffer, 1.1)

    def test_cost_line_without_buffer_reports_configured_buffer(self):
        BudgetSettings.objects.filter(account=self.account).update(buffer=Decimal("1.25"))
        service = BudgetCalculationService(self.scenario)

        result = service.calculate_year(2025)

        self.assertEqual(result.interventions[0].cost_breakdown[0].buffer, 1.25)

    def test_zero_cost_line_buffer_disables_buffering(self):
        BudgetSettings.objects.filter(account=self.account).update(inflation_rate=Decimal("0"))
        self.population_line.buffer = Decimal("0")
        self.population_line.save()
        service = BudgetCalculationService(self.scenario)

        result = service.calculate_year(2025)

        # quantity = 3000 * coverage(0.6) * factor(0.5), no buffer
        self.assertEqual(result.interventions[0].cost_breakdown[0].quantity, 900.0)

    def test_year_without_rule_coverage_uses_cost_line_coverage(self):
        BudgetSettings.objects.filter(account=self.account).update(inflation_rate=Decimal("0"))
        self.population_line.coverage = Decimal("80")
        self.population_line.save()
        service = BudgetCalculationService(self.scenario)

        result = service.calculate_year(2026)

        # No rule value for 2026: quantity = (1500 + 2500) * line coverage(0.8) * factor(0.5) * buffer(1.1)
        self.assertEqual(result.interventions[0].cost_breakdown[0].quantity, 1760.0)

    def test_rule_yearly_coverage_overrides_cost_line_coverage(self):
        BudgetSettings.objects.filter(account=self.account).update(inflation_rate=Decimal("0"))
        self.population_line.coverage = Decimal("80")
        self.population_line.save()
        service = BudgetCalculationService(self.scenario)

        result = service.calculate_year(2025)

        # The rule sets 2025 to 60%, which wins over the line coverage: 3000 * 0.6 * 0.5 * 1.1
        self.assertEqual(result.interventions[0].cost_breakdown[0].quantity, 990.0)

    def test_calculate_year_uses_default_yearly_multiplier_when_missing(self):
        service = BudgetCalculationService(self.scenario)

        result = service.calculate_year(2026)

        # default coverage = 100%
        # quantity = (1500 + 2500) * 1 * 0.5 * buffer(1.1) = 2200
        # total_cost = 2200 * 2 * (1 + 0.03)^1 = 4532
        self.assertEqual(result.total_cost, 4532.0)

    def test_inverted_conversion_factor_divides_quantity(self):
        self.population_line.conversion_factor = Decimal("2")
        self.population_line.invert_conversion_factor = True
        self.population_line.save(update_fields=["conversion_factor", "invert_conversion_factor"])

        service = BudgetCalculationService(self.scenario)

        result = service.calculate_year(2025)

        # ratio = 1 / 2 = 0.5, same numbers as the direct 0.5 factor
        self.assertEqual(result.total_cost, 1980.0)
        self.assertEqual(result.interventions[0].cost_breakdown[0].quantity, 990.0)

    def test_missing_population_layer_line_does_not_contribute(self):
        service = BudgetCalculationService(self.scenario)

        result = service.calculate_year(2025)

        # IPTp has a cost line with population_layer=None — it should produce nothing.
        self.assertEqual(len(result.interventions), 1)
        self.assertEqual(result.interventions[0].code, "smc")

    def test_missing_population_metric_value_contributes_zero_for_orgunit(self):
        MetricValue.objects.filter(metric_type=self.metric_under_5, org_unit=self.district_2, year=2025).delete()
        service = BudgetCalculationService(self.scenario)

        result = service.calculate_year(2025)

        self.assertEqual(result.total_cost, 660.0)
        self.assertEqual(len(result.org_units_costs), 1)
        self.assertEqual(result.org_units_costs[0].org_unit_id, self.district_1.id)
        self.assertEqual(len(result.interventions), 1)
        self.assertEqual(result.interventions[0].code, "smc")
        # quantity includes the buffer: 300 * 1.1 = 330
        self.assertEqual(result.interventions[0].cost_breakdown[0].quantity, 330.0)
        self.assertEqual(result.interventions[0].total_cost, 660.0)

    def test_no_assignments_results_in_zero_quantity_and_cost(self):
        # Remove the existing assignment to ensure no cost lines are included in the calculation.
        InterventionAssignment.objects.all().delete()

        service = BudgetCalculationService(self.scenario)

        result = service.calculate_year(2025)

        self.assertEqual(result.total_cost, 0.0)
        self.assertEqual(len(result.interventions), 0)
        self.assertEqual(len(result.org_units_costs), 0)
        self.assertEqual(len(result.category_costs), 0)

    def test_no_cost_lines_results_in_zero_quantity_and_cost(self):
        # Remove the existing cost lines to ensure no cost lines are included in the calculation.
        InterventionCostBreakdownLine.objects.all().delete()

        service = BudgetCalculationService(self.scenario)

        result = service.calculate_year(2025)

        self.assertEqual(result.total_cost, 0.0)
        self.assertEqual(len(result.interventions), 0)
        self.assertEqual(len(result.org_units_costs), 0)
        self.assertEqual(len(result.category_costs), 0)

    def test_no_inflation_rate_results_in_cost_without_inflation(self):
        BudgetSettings.objects.all().delete()

        service = BudgetCalculationService(self.scenario)

        result = service.calculate_year(2026)

        # quantity = (1500 + 2500) * 1 * 0.5 * buffer(1.1) = 2200
        # total_cost = 2200 * 2 * (1 + 0)^1 = 4400
        self.assertEqual(result.total_cost, 4400.0)

    def test_missing_rule_coverage_and_inflation_rate_results_in_cost_without_multipliers(self):
        BudgetSettings.objects.all().delete()
        ScenarioRuleCostOverride.objects.all().delete()

        service = BudgetCalculationService(self.scenario)

        result = service.calculate_year(2026)

        # quantity = (1500 + 2500) * 1 * 0.5 * buffer(1.1) = 2200
        # total_cost = 2200 * 2 = 4400
        self.assertEqual(result.total_cost, 4400.0)

    def test_fixed_cost_not_included_when_intervention_has_no_org_unit_assignment(self):
        """An intervention with only a fixed cost line and no org unit assignment contributes nothing."""
        scenario = self.create_snt_scenario(self.account, self.user, start_year=2025, end_year=2025)
        category = self.create_snt_intervention_category()
        intervention = self.create_snt_intervention(intervention_category=category, code="unassigned_fixed")
        InterventionCostBreakdownLine.objects.create(
            intervention=intervention,
            name="Unassigned fixed cost",
            category=InterventionCostBreakdownLine.InterventionCostBreakdownLineCategory.OPERATIONAL,
            unit_type=self.unit_type,
            population_layer=None,
            unit_cost=Decimal("500.00"),
            coverage=Decimal("1"),
            created_by=self.user,
        )
        # No InterventionAssignment created — intervention is never assigned to an org unit.

        service = BudgetCalculationService(scenario)
        result = service.calculate_year(2025)

        self.assertEqual(result.total_cost, 0.0)
        self.assertEqual(len(result.interventions), 0)
        self.assertEqual(len(result.org_units_costs), 0)
        self.assertEqual(len(result.category_costs), 0)

    def test_fixed_cost_added_once_with_multiple_org_unit_assignments(self):
        """Fixed cost line is counted exactly once regardless of how many org units the intervention covers."""
        scenario = self.create_snt_scenario(self.account, self.user, start_year=2025, end_year=2025)
        category = self.create_snt_intervention_category()
        intervention = self.create_snt_intervention(intervention_category=category, code="fixed_only_multi")
        self.create_snt_assignment(scenario, self.district_1, intervention)
        self.create_snt_assignment(scenario, self.district_2, intervention)

        InterventionCostBreakdownLine.objects.create(
            intervention=intervention,
            name="Multi-district fixed cost",
            category=InterventionCostBreakdownLine.InterventionCostBreakdownLineCategory.OPERATIONAL,
            unit_type=self.unit_type,
            population_layer=None,
            unit_cost=Decimal("100.00"),
            coverage=Decimal("1"),
            created_by=self.user,
        )

        service = BudgetCalculationService(scenario)
        result = service.calculate_year(2025)

        # quantity = line quantity(1) * buffer(1.1) = 1.1
        # total_cost = 1.1 * unit_cost(100) * inflation_multiplier(1.0) = 110.0
        self.assertEqual(result.total_cost, 110.0)
        self.assertEqual(len(result.interventions), 1)
        self.assertEqual(result.interventions[0].total_cost, 110.0)
        self.assertEqual(result.interventions[0].cost_breakdown[0].quantity, Decimal("1.1"))
        # Fixed costs are not attributed to specific org units.
        self.assertEqual(len(result.org_units_costs), 0)

    def test_fixed_and_population_costs_combined_with_second_population_only_intervention(self):
        """Fixed cost appears once in totals; population costs accumulate per org unit independently.
        A second intervention with only a population cost line is unaffected by the fixed cost.
        """
        scenario = self.create_snt_scenario(self.account, self.user, start_year=2025, end_year=2025)
        category = self.create_snt_intervention_category()

        # Intervention A: population + fixed cost, assigned to two districts.
        intervention_a = self.create_snt_intervention(intervention_category=category, code="iv_a")
        self.create_snt_assignment(scenario, self.district_1, intervention_a)
        self.create_snt_assignment(scenario, self.district_2, intervention_a)
        InterventionCostBreakdownLine.objects.create(
            intervention=intervention_a,
            name="IV-A population",
            category=InterventionCostBreakdownLine.InterventionCostBreakdownLineCategory.PROCUREMENT,
            unit_type=self.unit_type,
            population_layer=self.metric_under_5,
            is_proportional=True,
            conversion_factor=Decimal("0.5"),
            unit_cost=Decimal("2.00"),
            created_by=self.user,
        )
        InterventionCostBreakdownLine.objects.create(
            intervention=intervention_a,
            name="IV-A fixed cost",
            category=InterventionCostBreakdownLine.InterventionCostBreakdownLineCategory.OPERATIONAL,
            unit_type=self.unit_type,
            population_layer=None,
            unit_cost=Decimal("100.00"),
            coverage=Decimal("1"),
            created_by=self.user,
        )

        # Intervention B: population cost only, assigned to district_1.
        intervention_b = self.create_snt_intervention(intervention_category=category, code="iv_b")
        self.create_snt_assignment(scenario, self.district_1, intervention_b)
        InterventionCostBreakdownLine.objects.create(
            intervention=intervention_b,
            name="IV-B population",
            category=InterventionCostBreakdownLine.InterventionCostBreakdownLineCategory.PROCUREMENT,
            unit_type=self.unit_type,
            population_layer=self.metric_under_5,
            is_proportional=True,
            conversion_factor=Decimal("0.5"),
            unit_cost=Decimal("3.00"),
            created_by=self.user,
        )

        service = BudgetCalculationService(scenario)
        result = service.calculate_year(2025)

        # quantity includes the buffer(1.1):
        # IV-A population (district_1): 1000 * 1.0 * 0.5 * 1.1 = 550 qty → 550 * 2 = 1100
        # IV-A population (district_2): 2000 * 1.0 * 0.5 * 1.1 = 1100 qty → 1100 * 2 = 2200
        # IV-A fixed cost (once):          1 * 1.1 = 1.1 qty              →  1.1 * 100 = 110
        # IV-A total = 1100 + 2200 + 110 = 3410

        # IV-B population (district_1): 1000 * 1.0 * 0.5 * 1.1 = 550 qty → 550 * 3 = 1650
        # IV-B total = 1650

        # Grand total = 3410 + 1650 = 5060
        self.assertEqual(result.total_cost, 5060.0)
        self.assertEqual(len(result.interventions), 2)

        iv_a = next(i for i in result.interventions if i.code == "iv_a")
        iv_b = next(i for i in result.interventions if i.code == "iv_b")
        self.assertEqual(iv_a.total_cost, 3410.0)
        self.assertEqual(iv_b.total_cost, 1650.0)

        # Fixed cost rows have no org_unit_id and are excluded from the per-org-unit breakdown.
        # district_1: IV-A pop (1100) + IV-B pop (1650) = 2750
        # district_2: IV-A pop (2200) only
        self.assertEqual(len(result.org_units_costs), 2)
        d1 = next(o for o in result.org_units_costs if o.org_unit_id == self.district_1.id)
        d2 = next(o for o in result.org_units_costs if o.org_unit_id == self.district_2.id)
        self.assertEqual(d1.total_cost, 2750.0)
        self.assertEqual(d2.total_cost, 2200.0)

    def test_year_the_rule_does_not_deploy_costs_nothing(self):
        rule_intervention = self.get_snt_rule_intervention(self.rule, self.intervention_smc)
        rule_intervention.deployment_years = [2025]
        rule_intervention.save()

        result = BudgetCalculationService(self.scenario).calculate_year(2026)

        self.assertEqual(result.total_cost, 0.0)

    def test_rule_yearly_coverage_costs_a_year_the_rule_does_not_deploy(self):
        rule_intervention = self.get_snt_rule_intervention(self.rule, self.intervention_smc)
        rule_intervention.deployment_years = [2026]
        rule_intervention.save()

        result = BudgetCalculationService(self.scenario).calculate_year(2025)

        # The 2025 coverage set for the rule applies even though 2025 is not deployed: 3000 * 0.6 * 0.5 * 1.1
        self.assertEqual(result.interventions[0].cost_breakdown[0].quantity, 990.0)

    def test_zero_rule_yearly_coverage_skips_a_deployed_year(self):
        self.create_snt_rule_cost_override(self.rule, self.population_line, year=2026, coverage=Decimal("0"))

        result = BudgetCalculationService(self.scenario).calculate_year(2026)

        self.assertEqual(result.total_cost, 0.0)

    def test_rule_values_resolve_year_then_all_years_then_cost_line(self):
        BudgetSettings.objects.filter(account=self.account).update(inflation_rate=Decimal("0"))
        self.create_snt_rule_cost_override(
            self.rule,
            self.population_line,
            unit_cost=Decimal("4"),
            conversion_factor=Decimal("1"),
            buffer=Decimal("0"),
            coverage=Decimal("50"),
        )
        service = BudgetCalculationService(self.scenario)

        # 2025 keeps its year coverage (60%): 3000 * 0.6 * factor(1) * buffer(1) = 1800, * unit cost(4)
        result_2025 = service.calculate_year(2025)
        self.assertEqual(result_2025.interventions[0].cost_breakdown[0].quantity, 1800.0)
        self.assertEqual(result_2025.total_cost, 7200.0)
        # 2026 uses the all-years coverage (50%): 4000 * 0.5 = 2000, * unit cost(4)
        result_2026 = service.calculate_year(2026)
        self.assertEqual(result_2026.interventions[0].cost_breakdown[0].quantity, 2000.0)
        self.assertEqual(result_2026.total_cost, 8000.0)

    def test_same_intervention_in_two_rules_costs_each_org_unit_with_its_rule_values(self):
        BudgetSettings.objects.filter(account=self.account).update(inflation_rate=Decimal("0"))
        priority_rule = self.create_snt_rule(self.scenario, [self.intervention_smc], name="Priority rule")
        InterventionAssignment.objects.filter(intervention=self.intervention_smc, org_unit=self.district_2).update(
            rule=priority_rule
        )
        self.create_snt_rule_cost_override(priority_rule, self.population_line, unit_cost=Decimal("10"))

        result = BudgetCalculationService(self.scenario).calculate_year(2026)

        costs_by_org_unit = {item.org_unit_id: item.total_cost for item in result.org_units_costs}
        # district_1 (first rule): 1500 * 0.5 * 1.1 = 825 * unit cost(2) = 1650
        self.assertEqual(costs_by_org_unit[self.district_1.id], 1650.0)
        # district_2 (priority rule): 2500 * 0.5 * 1.1 = 1375 * unit cost(10) = 13750
        self.assertEqual(costs_by_org_unit[self.district_2.id], 13750.0)

    def _create_fixed_cost_rules(self):
        """A fixed line on an intervention deployed by a low and a high priority rule, one district each."""
        BudgetSettings.objects.filter(account=self.account).update(inflation_rate=Decimal("0"))
        intervention = self.create_snt_intervention(intervention_category=self.create_snt_intervention_category())
        fixed_line = self.create_snt_cost_line(intervention, unit_type=self.unit_type, unit_cost=Decimal("100"))
        low_rule = self.create_snt_rule(self.scenario, [intervention], name="Low")
        high_rule = self.create_snt_rule(self.scenario, [intervention], name="High")
        self.create_snt_assignment(self.scenario, self.district_1, intervention, rule=low_rule)
        self.create_snt_assignment(self.scenario, self.district_2, intervention, rule=high_rule)
        self.create_snt_rule_cost_override(high_rule, fixed_line, unit_cost=Decimal("300"))
        return intervention, fixed_line, low_rule, high_rule

    def _intervention_cost(self, result, intervention):
        return next(item.total_cost for item in result.interventions if item.code == intervention.code)

    def test_fixed_cost_uses_values_of_highest_priority_rule_costing_the_year(self):
        intervention, fixed_line, _, high_rule = self._create_fixed_cost_rules()
        self.create_snt_rule_cost_override(high_rule, fixed_line, year=2025, coverage=Decimal("0"))
        service = BudgetCalculationService(self.scenario)

        # 2025: the high priority rule does not cost it, so the low priority rule's line values apply: 1 * 1.1 * 100
        self.assertEqual(self._intervention_cost(service.calculate_year(2025), intervention), 110.0)
        # 2026: the high priority rule costs it with its own unit cost, once: 1 * 1.1 * 300
        self.assertEqual(self._intervention_cost(service.calculate_year(2026), intervention), 330.0)

    def test_fixed_cost_multiplies_the_resolved_quantity(self):
        intervention, fixed_line, _, high_rule = self._create_fixed_cost_rules()
        fixed_line.coverage = Decimal("2")
        fixed_line.save()
        self.create_snt_rule_cost_override(high_rule, fixed_line, year=2026, coverage=Decimal("4"))
        service = BudgetCalculationService(self.scenario)

        # 2025: the cost line quantity (2) * buffer(1.1) * the rule's unit cost(300)
        self.assertEqual(self._intervention_cost(service.calculate_year(2025), intervention), 660.0)
        # 2026: the rule's yearly quantity (4) * 1.1 * 300
        self.assertEqual(self._intervention_cost(service.calculate_year(2026), intervention), 1320.0)

    def test_fixed_cost_not_costed_when_no_rule_costs_the_year(self):
        intervention, _, low_rule, high_rule = self._create_fixed_cost_rules()
        for rule in (low_rule, high_rule):
            rule_intervention = self.get_snt_rule_intervention(rule, intervention)
            rule_intervention.deployment_years = [2026]
            rule_intervention.save()

        result = BudgetCalculationService(self.scenario).calculate_year(2025)

        self.assertNotIn(intervention.code, [item.code for item in result.interventions])

    def test_fixed_cost_grant_comes_from_the_costing_rule(self):
        intervention, _, _, high_rule = self._create_fixed_cost_rules()
        grant = self.create_snt_grant(name="Rule grant")
        rule_intervention = self.get_snt_rule_intervention(high_rule, intervention)
        rule_intervention.grant = grant
        rule_intervention.save()

        grant_costs = BudgetCalculationService(self.scenario).calculate_grant_costs()

        rule_grant_cost = next(item for item in grant_costs if item.grant_id == grant.id)
        # 330 per year (1 * 1.1 * 300) for 2025 and 2026
        self.assertEqual(rule_grant_cost.total_cost, 660.0)
