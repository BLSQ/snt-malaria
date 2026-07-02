from decimal import Decimal

from iaso.models import MetricType, MetricValue
from plugins.snt_malaria.models import (
    BudgetSettings,
    InterventionAssignment,
    InterventionCostBreakdownLine,
    ScenarioYearlyCostAssignment,
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
            value=Decimal("0.5"),
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

        # For year 2025 only: multiplier 1.2. Year 2026 should fallback to 1.
        ScenarioYearlyCostAssignment.objects.create(
            scenario=self.scenario,
            cost_line=self.population_line,
            year=2025,
            value=Decimal("1.20"),
        )

    def test_calculate_year_applies_formula_and_aggregates(self):
        service = BudgetCalculationService(self.scenario)

        result = service.calculate_year(2025)

        # cost = quantity * unit_cost(2.0) * buffer(1.1)
        # district_1 = 1200 * 1.1 = 1320, district_2 = 2400 * 1.1 = 2640, total = 3960
        self.assertEqual(result.total_cost, 3960.0)

        self.assertEqual(len(result.interventions), 1)
        intervention = result.interventions[0]
        self.assertEqual(intervention.code, "smc")
        self.assertEqual(intervention.total_cost, 3960.0)
        self.assertEqual(len(intervention.cost_breakdown), 1)
        breakdown = intervention.cost_breakdown[0]
        self.assertEqual(breakdown.category, "Procurement")
        self.assertEqual(breakdown.total_cost, 3960.0)
        # quantity = district_1(600) + district_2(1200) = 1800
        self.assertEqual(breakdown.quantity, 1800.0)
        # population = district_1(1000) + district_2(2000) = 3000
        self.assertEqual(breakdown.population, 3000.0)

        self.assertEqual(len(result.org_units_costs), 2)
        district_1_result = result.org_units_costs[0]
        district_2_result = result.org_units_costs[1]

        self.assertEqual(district_1_result.total_cost, 1320.0)
        self.assertEqual(district_2_result.total_cost, 2640.0)

        self.assertEqual(len(result.category_costs), 1)
        self.assertEqual(result.category_costs[0].category, "Procurement")
        self.assertEqual(result.category_costs[0].quantity, 1800.0)
        self.assertEqual(result.category_costs[0].total_cost, 3960.0)

    def test_calculate_year_uses_default_yearly_multiplier_when_missing(self):
        service = BudgetCalculationService(self.scenario)

        result = service.calculate_year(2026)

        # default yearly value = 1
        # quantity = (1500 + 2500) * 1 * 0.5 = 2000
        # total_cost = 2000 * 2 * 1.1 * (1 + 0.03)^1 = 4532
        self.assertEqual(result.total_cost, 4532.0)

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

        self.assertEqual(result.total_cost, 1320.0)
        self.assertEqual(len(result.org_units_costs), 1)
        self.assertEqual(result.org_units_costs[0].org_unit_id, self.district_1.id)
        self.assertEqual(len(result.interventions), 1)
        self.assertEqual(result.interventions[0].code, "smc")
        self.assertEqual(result.interventions[0].cost_breakdown[0].quantity, 600.0)
        self.assertEqual(result.interventions[0].total_cost, 1320.0)

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

        # quantity = (1500 + 2500) * 1 * 0.5 = 2000
        # total_cost = 2000 * 2 * 1.1 * (1 + 0)^1 = 4400
        self.assertEqual(result.total_cost, 4400.0)

    def test_missing_yearly_multiplier_and_inflation_rate_results_in_cost_without_multipliers(self):
        BudgetSettings.objects.all().delete()
        ScenarioYearlyCostAssignment.objects.all().delete()

        service = BudgetCalculationService(self.scenario)

        result = service.calculate_year(2026)

        # quantity = (1500 + 2500) * 1 * 0.5 = 2000
        # total_cost = 2000 * 2 * 1.1 = 4400
        self.assertEqual(result.total_cost, 4400.0)

    def test_fixed_cost_not_included_when_intervention_has_no_org_unit_assignment(self):
        """An intervention with only a fixed cost line and no org unit assignment contributes nothing."""
        scenario = self.create_snt_scenario(self.account, self.user, start_year=2025, end_year=2025)
        category = self.create_snt_intervention_category()
        intervention = self.create_snt_intervention(intervention_category=category, code="unassigned_fixed")
        fixed_line = InterventionCostBreakdownLine.objects.create(
            intervention=intervention,
            name="Unassigned fixed cost",
            category=InterventionCostBreakdownLine.InterventionCostBreakdownLineCategory.OPERATIONAL,
            unit_type=self.unit_type,
            population_layer=None,
            unit_cost=Decimal("500.00"),
            created_by=self.user,
        )
        ScenarioYearlyCostAssignment.objects.create(
            scenario=scenario,
            cost_line=fixed_line,
            year=2025,
            value=Decimal("3"),
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

        fixed_line = InterventionCostBreakdownLine.objects.create(
            intervention=intervention,
            name="Multi-district fixed cost",
            category=InterventionCostBreakdownLine.InterventionCostBreakdownLineCategory.OPERATIONAL,
            unit_type=self.unit_type,
            population_layer=None,
            unit_cost=Decimal("100.00"),
            created_by=self.user,
        )
        ScenarioYearlyCostAssignment.objects.create(
            scenario=scenario,
            cost_line=fixed_line,
            year=2025,
            value=Decimal("4"),
        )

        service = BudgetCalculationService(scenario)
        result = service.calculate_year(2025)

        # quantity = 4 * ratio(0.5) = 2.0
        # total_cost = 2 * unit_cost(100) * buffer(1.1) * inflation_multiplier(1.0) = 220.0
        self.assertEqual(result.total_cost, 220.0)
        self.assertEqual(len(result.interventions), 1)
        self.assertEqual(result.interventions[0].total_cost, 220.0)
        self.assertEqual(result.interventions[0].cost_breakdown[0].quantity, 2.0)
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
        pop_line_a = InterventionCostBreakdownLine.objects.create(
            intervention=intervention_a,
            name="IV-A population",
            category=InterventionCostBreakdownLine.InterventionCostBreakdownLineCategory.PROCUREMENT,
            unit_type=self.unit_type,
            population_layer=self.metric_under_5,
            unit_cost=Decimal("2.00"),
            created_by=self.user,
        )
        fixed_line_a = InterventionCostBreakdownLine.objects.create(
            intervention=intervention_a,
            name="IV-A fixed cost",
            category=InterventionCostBreakdownLine.InterventionCostBreakdownLineCategory.OPERATIONAL,
            unit_type=self.unit_type,
            population_layer=None,
            unit_cost=Decimal("100.00"),
            created_by=self.user,
        )
        ScenarioYearlyCostAssignment.objects.create(
            scenario=scenario,
            cost_line=pop_line_a,
            year=2025,
            value=Decimal("1.0"),
        )
        ScenarioYearlyCostAssignment.objects.create(
            scenario=scenario,
            cost_line=fixed_line_a,
            year=2025,
            value=Decimal("4"),
        )

        # Intervention B: population cost only, assigned to district_1.
        intervention_b = self.create_snt_intervention(intervention_category=category, code="iv_b")
        self.create_snt_assignment(scenario, self.district_1, intervention_b)
        pop_line_b = InterventionCostBreakdownLine.objects.create(
            intervention=intervention_b,
            name="IV-B population",
            category=InterventionCostBreakdownLine.InterventionCostBreakdownLineCategory.PROCUREMENT,
            unit_type=self.unit_type,
            population_layer=self.metric_under_5,
            unit_cost=Decimal("3.00"),
            created_by=self.user,
        )
        ScenarioYearlyCostAssignment.objects.create(
            scenario=scenario,
            cost_line=pop_line_b,
            year=2025,
            value=Decimal("1.0"),
        )

        service = BudgetCalculationService(scenario)
        result = service.calculate_year(2025)

        # IV-A population (district_1): 1000 * 1.0 * 0.5 = 500 qty → 500 * 2 * 1.1 = 1100
        # IV-A population (district_2): 2000 * 1.0 * 0.5 = 1000 qty → 1000 * 2 * 1.1 = 2200
        # IV-A fixed cost (once):          4 * 0.5 = 2 qty          →    2 * 100 * 1.1 = 220
        # IV-A total = 1100 + 2200 + 220 = 3520

        # IV-B population (district_1): 1000 * 1.0 * 0.5 = 500 qty → 500 * 3 * 1.1 = 1650
        # IV-B total = 1650

        # Grand total = 3520 + 1650 = 5170
        self.assertEqual(result.total_cost, 5170.0)
        self.assertEqual(len(result.interventions), 2)

        iv_a = next(i for i in result.interventions if i.code == "iv_a")
        iv_b = next(i for i in result.interventions if i.code == "iv_b")
        self.assertEqual(iv_a.total_cost, 3520.0)
        self.assertEqual(iv_b.total_cost, 1650.0)

        # Fixed cost rows have no org_unit_id and are excluded from the per-org-unit breakdown.
        # district_1: IV-A pop (1100) + IV-B pop (1650) = 2750
        # district_2: IV-A pop (2200) only
        self.assertEqual(len(result.org_units_costs), 2)
        d1 = next(o for o in result.org_units_costs if o.org_unit_id == self.district_1.id)
        d2 = next(o for o in result.org_units_costs if o.org_unit_id == self.district_2.id)
        self.assertEqual(d1.total_cost, 2750.0)
        self.assertEqual(d2.total_cost, 2200.0)

    def test_fixed_cost_defaults_to_zero_when_no_yearly_assignment(self):
        """Fixed cost line with no ScenarioYearlyCostAssignment defaults yearly_value to 0 and contributes nothing."""
        scenario = self.create_snt_scenario(self.account, self.user, start_year=2025, end_year=2025)
        category = self.create_snt_intervention_category()
        intervention = self.create_snt_intervention(intervention_category=category, code="fixed_no_assignment")
        self.create_snt_assignment(scenario, self.district_1, intervention)

        InterventionCostBreakdownLine.objects.create(
            intervention=intervention,
            name="Fixed cost without yearly assignment",
            category=InterventionCostBreakdownLine.InterventionCostBreakdownLineCategory.OPERATIONAL,
            unit_type=self.unit_type,
            population_layer=None,
            unit_cost=Decimal("500.00"),
            created_by=self.user,
        )
        # No ScenarioYearlyCostAssignment created — yearly_value defaults to 0 for fixed costs.

        service = BudgetCalculationService(scenario)
        result = service.calculate_year(2025)

        self.assertEqual(result.total_cost, 0.0)
        self.assertEqual(len(result.interventions), 0)
        self.assertEqual(len(result.org_units_costs), 0)
        self.assertEqual(len(result.category_costs), 0)
