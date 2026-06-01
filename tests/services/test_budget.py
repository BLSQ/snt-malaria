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
            ratio=Decimal("0.5"),
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
            cost_driver=InterventionCostBreakdownLine.CostDriver.POPULATION,
            unit_cost=Decimal("2.00"),
            created_by=self.user,
        )

        # Should be skipped for now by the internal calculator.
        self.fixed_cost_line = InterventionCostBreakdownLine.objects.create(
            intervention=self.intervention_smc,
            name="SMC fixed",
            category=InterventionCostBreakdownLine.InterventionCostBreakdownLineCategory.OPERATIONAL,
            unit_type=self.unit_type,
            population_layer=self.metric_under_5,
            cost_driver=InterventionCostBreakdownLine.CostDriver.FIXED_COST,
            unit_cost=Decimal("999.00"),
            created_by=self.user,
        )

        # Missing population layer should contribute zero.
        self.no_population_layer_line = InterventionCostBreakdownLine.objects.create(
            intervention=self.intervention_iptp,
            name="IPTp no layer",
            category=InterventionCostBreakdownLine.InterventionCostBreakdownLineCategory.PROCUREMENT,
            unit_type=self.unit_type,
            population_layer=None,
            cost_driver=InterventionCostBreakdownLine.CostDriver.POPULATION,
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

        # quantity = pop * yearly_value * ratio
        # district_1: 1000 * 1.2 * 0.5 = 600
        # district_2: 2000 * 1.2 * 0.5 = 1200
        # total quantity = 1800
        self.assertEqual(result.quantity, 1800.0)

        # cost = quantity * unit_cost(2.0) * buffer(1.1)
        # district_1 = 1200 * 1.1 = 1320, district_2 = 2400 * 1.1 = 2640, total = 3960
        self.assertEqual(result.total_cost, 3960.0)

        self.assertEqual(len(result.interventions), 1)
        intervention = result.interventions[0]
        self.assertEqual(intervention.code, "smc")
        self.assertEqual(intervention.quantity, 1800.0)
        self.assertEqual(intervention.total_pop, 3000.0)
        self.assertEqual(intervention.total_cost, 3960.0)
        self.assertEqual(len(intervention.cost_breakdown), 1)
        self.assertEqual(intervention.cost_breakdown[0].category, "Procurement")
        self.assertEqual(intervention.cost_breakdown[0].total_cost, 3960.0)

        self.assertEqual(len(result.org_units_costs), 2)
        district_1_result = result.org_units_costs[0]
        district_2_result = result.org_units_costs[1]

        self.assertEqual(district_1_result.quantity, 600.0)
        self.assertEqual(district_1_result.total_cost, 1320.0)
        self.assertEqual(district_2_result.quantity, 1200.0)
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
        self.assertEqual(result.quantity, 2000.0)
        self.assertEqual(result.total_cost, 4532.0)

    def test_skips_fixed_cost_and_missing_population_layer_lines(self):
        service = BudgetCalculationService(self.scenario)

        result = service.calculate_year(2025)

        self.assertEqual(len(result.interventions), 1)
        self.assertEqual(result.interventions[0].code, "smc")

        categories = [c.category for c in result.category_costs]
        self.assertNotIn("Operational", categories)

    def test_missing_population_metric_value_contributes_zero_for_orgunit(self):
        MetricValue.objects.filter(metric_type=self.metric_under_5, org_unit=self.district_2, year=2025).delete()
        service = BudgetCalculationService(self.scenario)

        result = service.calculate_year(2025)

        self.assertEqual(result.quantity, 600.0)
        self.assertEqual(result.total_cost, 1320.0)
        self.assertEqual(len(result.org_units_costs), 1)
        self.assertEqual(result.org_units_costs[0].org_unit_id, self.district_1.id)
        self.assertEqual(len(result.interventions), 1)
        self.assertEqual(result.interventions[0].code, "smc")
        self.assertEqual(result.interventions[0].quantity, 600.0)
        self.assertEqual(result.interventions[0].total_cost, 1320.0)

    def test_no_assignments_results_in_zero_quantity_and_cost(self):
        # Remove the existing assignment to ensure no cost lines are included in the calculation.
        InterventionAssignment.objects.all().delete()

        service = BudgetCalculationService(self.scenario)

        result = service.calculate_year(2025)

        self.assertEqual(result.quantity, 0.0)
        self.assertEqual(result.total_cost, 0.0)
        self.assertEqual(len(result.interventions), 0)
        self.assertEqual(len(result.org_units_costs), 0)
        self.assertEqual(len(result.category_costs), 0)

    def test_no_cost_lines_results_in_zero_quantity_and_cost(self):
        # Remove the existing cost lines to ensure no cost lines are included in the calculation.
        InterventionCostBreakdownLine.objects.all().delete()

        service = BudgetCalculationService(self.scenario)

        result = service.calculate_year(2025)

        self.assertEqual(result.quantity, 0.0)
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
        self.assertEqual(result.quantity, 2000.0)
        self.assertEqual(result.total_cost, 4400.0)

    def test_missing_yearly_multiplier_and_inflation_rate_results_in_cost_without_multipliers(self):
        BudgetSettings.objects.all().delete()
        ScenarioYearlyCostAssignment.objects.all().delete()

        service = BudgetCalculationService(self.scenario)

        result = service.calculate_year(2026)

        # quantity = (1500 + 2500) * 1 * 0.5 = 2000
        # total_cost = 2000 * 2 * 1.1 = 4400
        self.assertEqual(result.quantity, 2000.0)
        self.assertEqual(result.total_cost, 4400.0)
