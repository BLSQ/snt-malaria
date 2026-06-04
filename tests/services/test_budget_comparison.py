from collections import defaultdict
from decimal import Decimal
from typing import Any

from snt_malaria_budgeting import DEFAULT_COST_ASSUMPTIONS, BudgetCalculator

from iaso.models import MetricType, MetricValue
from plugins.snt_malaria.api.budget.utils import (
    build_cost_dataframe,
    build_interventions_input,
    build_population_dataframe,
)
from plugins.snt_malaria.models import (
    BudgetSettings,
    InterventionCostBreakdownLine,
    ScenarioYearlyCostAssignment,
)
from plugins.snt_malaria.models.cost_unit_type import CostUnitType
from plugins.snt_malaria.services import BudgetCalculationService
from plugins.snt_malaria.tests.common_base import SNTMalariaTestCase


class BudgetCalculationComparisonTestCase(SNTMalariaTestCase):
    def setUp(self):
        super().setUp()

        self.scenario = self.create_snt_scenario(
            self.account,
            self.user,
            name="Comparison Scenario",
            start_year=2025,
            end_year=2025,
        )
        self.category = self.create_snt_intervention_category(
            account=self.account,
            created_by=self.user,
            name="Comparison Category",
        )
        self.org_unit_type = self.create_snt_org_unit_type(name="COMPARISON_DISTRICT")
        self.district = self.create_snt_org_unit(org_unit_type=self.org_unit_type, name="Comparison District")

        BudgetSettings.objects.filter(account=self.account).delete()
        BudgetSettings.objects.create(
            account=self.account,
            local_currency="XOF",
            exchange_rate=Decimal("1"),
            inflation_rate=Decimal("0"),
        )

    def _get_or_create_metric_type(self, code: str):
        metric_type, _ = MetricType.objects.get_or_create(
            account=self.account,
            code=code,
            defaults={
                "name": code,
                "description": code,
                "units": "people",
            },
        )
        return metric_type

    def _compare_single_intervention(self, config: dict[str, Any]):
        intervention = self.create_snt_intervention(
            target_population=config.get("target_population", []),
            intervention_category=self.category,
            created_by=self.user,
            name=config["intervention_name"],
            short_name=config["intervention_type"],
            code=config["intervention_code"],
        )
        self.create_snt_assignment(self.scenario, self.district, intervention, created_by=self.user)

        metric_types_by_code = {}
        for metric_code, metric_value in config["metrics"].items():
            metric_type = self._get_or_create_metric_type(metric_code)
            metric_types_by_code[metric_code] = metric_type
            MetricValue.objects.create(
                metric_type=metric_type,
                org_unit=self.district,
                year=2025,
                value=Decimal(metric_value),
            )

        yearly_assignments = []
        for line_config in config["cost_lines"]:
            unit_type, _ = CostUnitType.objects.get_or_create(
                account=self.account,
                name=line_config["unit_name"],
                defaults={"ratio": Decimal(line_config["ratio"])},
            )
            unit_type.ratio = Decimal(line_config["ratio"])
            unit_type.save(update_fields=["ratio"])

            cost_line = InterventionCostBreakdownLine.objects.create(
                unit_type=unit_type,
                intervention=intervention,
                name=line_config["line_name"],
                category=InterventionCostBreakdownLine.InterventionCostBreakdownLineCategory.PROCUREMENT,
                population_layer=metric_types_by_code[line_config["population_metric_code"]],
                cost_driver=InterventionCostBreakdownLine.CostDriver.POPULATION,
                unit_cost=Decimal(line_config["unit_cost"]),
                created_by=self.user,
            )
            yearly_assignments.append(
                ScenarioYearlyCostAssignment(
                    scenario=self.scenario,
                    cost_line=cost_line,
                    year=2025,
                    value=Decimal(line_config["yearly_value"]),
                )
            )
        ScenarioYearlyCostAssignment.objects.bulk_create(yearly_assignments)

        internal_result = BudgetCalculationService(self.scenario).calculate_year(2025)

        intervention_population_metric_codes = sorted(
            set(config.get("target_population", [])) | set(config.get("extra_population_metric_codes", []))
        )
        population_df = build_population_dataframe(
            self.account,
            2025,
            2025,
            intervention_population_metric_codes=intervention_population_metric_codes,
        )
        cost_df = build_cost_dataframe(self.account, 2025, 2025)
        interventions_input = build_interventions_input(self.scenario)
        legacy_calculator = BudgetCalculator(
            interventions_input=interventions_input,
            settings={2025: DEFAULT_COST_ASSUMPTIONS.copy()},
            cost_df=cost_df,
            population_df=population_df,
            local_currency="XOF",
            budget_currency="USD",
            spatial_planning_unit="org_unit_id",
            unknown_intervention_handling="handle",
        )

        legacy_interventions = legacy_calculator.get_interventions_costs(2025)
        legacy_places = legacy_calculator.get_places_costs(2025)

        internal_by_code = {item.code: item for item in internal_result.interventions}
        legacy_by_code = {item["code"]: item for item in legacy_interventions if item["total_cost"] > 0}

        self.assertSetEqual(set(internal_by_code.keys()), set(legacy_by_code.keys()))

        for code in legacy_by_code.keys():
            msg = (
                f"Mismatch for intervention {code}: internal={internal_by_code[code].total_cost}, "
                f"legacy={legacy_by_code[code]['total_cost']}"
            )
            if "assert_delta" in config:
                self.assertAlmostEqual(
                    float(internal_by_code[code].total_cost),
                    float(legacy_by_code[code]["total_cost"]),
                    delta=float(config["assert_delta"]),
                    msg=msg,
                )
            else:
                self.assertAlmostEqual(
                    float(internal_by_code[code].total_cost),
                    float(legacy_by_code[code]["total_cost"]),
                    places=3,
                    msg=msg,
                )

            internal_cost_by_category = defaultdict(Decimal)
            for item in internal_by_code[code].cost_breakdown:
                internal_cost_by_category[item.category] += item.total_cost
            legacy_breakdown_by_category = {item["cost_class"]: item for item in legacy_by_code[code]["cost_breakdown"]}
            self.assertSetEqual(set(internal_cost_by_category.keys()), set(legacy_breakdown_by_category.keys()))
            for category in legacy_breakdown_by_category.keys():
                category_msg = (
                    f"Mismatch for intervention {code} category {category}: "
                    f"internal={internal_cost_by_category[category]}, "
                    f"legacy={legacy_breakdown_by_category[category]['cost']}"
                )
                if "assert_delta" in config:
                    self.assertAlmostEqual(
                        float(internal_cost_by_category[category]),
                        float(legacy_breakdown_by_category[category]["cost"]),
                        delta=float(config["assert_delta"]),
                        msg=category_msg,
                    )
                else:
                    self.assertAlmostEqual(
                        float(internal_cost_by_category[category]),
                        float(legacy_breakdown_by_category[category]["cost"]),
                        places=3,
                        msg=category_msg,
                    )

        self.assertEqual(len(internal_result.org_units_costs), 1)
        legacy_places_with_cost = [item for item in legacy_places if item["total_cost"] > 0]
        self.assertEqual(len(legacy_places_with_cost), 1)
        if "assert_delta" in config:
            self.assertAlmostEqual(
                float(internal_result.org_units_costs[0].total_cost),
                float(legacy_places_with_cost[0]["total_cost"]),
                delta=float(config["assert_delta"]),
            )
            self.assertAlmostEqual(
                float(internal_result.total_cost),
                float(sum(item["total_cost"] for item in legacy_interventions)),
                delta=float(config["assert_delta"]),
            )
        else:
            self.assertAlmostEqual(
                float(internal_result.org_units_costs[0].total_cost),
                float(legacy_places_with_cost[0]["total_cost"]),
                places=3,
            )
            self.assertAlmostEqual(
                float(internal_result.total_cost),
                float(sum(item["total_cost"] for item in legacy_interventions)),
                places=3,
            )

    def test_compare_iptp_quantification(self):
        self._compare_single_intervention(
            {
                "intervention_code": "iptp",
                "intervention_name": "IPTp",
                "intervention_type": "SP",
                "target_population": ["POP_PREGNANT_WOMAN"],
                "metrics": {
                    "POPULATION": "1000",
                    "POP_PREGNANT_WOMAN": "100",
                },
                "cost_lines": [
                    {
                        "line_name": "IPTp commodity",
                        "unit_name": "per SP",
                        "ratio": "3",
                        "population_metric_code": "POP_PREGNANT_WOMAN",
                        "unit_cost": "2.50",
                        "yearly_value": "0.80",
                    },
                ],
            }
        )

    def test_compare_itn_campaign_quantification(self):
        self._compare_single_intervention(
            {
                "intervention_code": "itn_campaign",
                "intervention_name": "ITN Campaign",
                "intervention_type": "ITN Campaign",
                "target_population": ["POPULATION"],
                "assert_delta": "0.001",
                "metrics": {
                    "POPULATION": "1000",
                },
                "cost_lines": [
                    {
                        "line_name": "ITN campaign nets",
                        "unit_name": "per ITN",
                        "ratio": "0.5555555555555556",
                        "population_metric_code": "POPULATION",
                        "unit_cost": "1.20",
                        "yearly_value": "1",
                    },
                    {
                        "line_name": "ITN campaign bales",
                        "unit_name": "per bale",
                        "ratio": "0.0111111111111111",
                        "population_metric_code": "POPULATION",
                        "unit_cost": "10.00",
                        "yearly_value": "1",
                    },
                ],
            }
        )

    def test_compare_itn_school_quantification(self):
        self._compare_single_intervention(
            {
                "intervention_code": "itn_school",
                "intervention_name": "ITN School",
                "intervention_type": "ITN School",
                "target_population": ["POPULATION"],
                "assert_delta": "0.001",
                "metrics": {
                    "POPULATION": "1000",
                },
                "cost_lines": [
                    {
                        "line_name": "ITN school nets",
                        "unit_name": "per ITN",
                        "ratio": "0.5555555555555556",
                        "population_metric_code": "POPULATION",
                        "unit_cost": "1.20",
                        "yearly_value": "1",
                    },
                    {
                        "line_name": "ITN school bales",
                        "unit_name": "per bale",
                        "ratio": "0.0111111111111111",
                        "population_metric_code": "POPULATION",
                        "unit_cost": "10.00",
                        "yearly_value": "1",
                    },
                ],
            }
        )

    def test_compare_itn_routine_quantification(self):
        self._compare_single_intervention(
            {
                "intervention_code": "itn_routine",
                "intervention_name": "ITN Routine",
                "intervention_type": "ITN Routine",
                "target_population": ["POP_UNDER_5"],
                "metrics": {
                    "POPULATION": "1000",
                    "POP_UNDER_5": "240",
                },
                "cost_lines": [
                    {
                        "line_name": "ITN routine",
                        "unit_name": "per ITN",
                        "ratio": "1",
                        "population_metric_code": "POP_UNDER_5",
                        "unit_cost": "2.10",
                        "yearly_value": "0.3",
                    },
                ],
            }
        )

    def test_compare_smc_quantification(self):
        self._compare_single_intervention(
            {
                "intervention_code": "smc",
                "intervention_name": "SMC",
                "intervention_type": "SP+AQ",
                "target_population": ["POP_UNDER_5"],
                "metrics": {
                    "POPULATION": "1000",
                    "POP_UNDER_5": "200",
                },
                "cost_lines": [
                    {
                        "line_name": "SMC 3-11",
                        "unit_name": "per SPAQ pack 3-11 month olds",
                        "ratio": "0.72",
                        "population_metric_code": "POP_UNDER_5",
                        "unit_cost": "1.00",
                        "yearly_value": "1",
                    },
                    {
                        "line_name": "SMC 12-59",
                        "unit_name": "per SPAQ pack 12-59 month olds",
                        "ratio": "3.08",
                        "population_metric_code": "POP_UNDER_5",
                        "unit_cost": "1.00",
                        "yearly_value": "1",
                    },
                ],
            }
        )

    def test_compare_smc_3_quantification(self):
        self._compare_single_intervention(
            {
                "intervention_code": "smc_3",
                "intervention_name": "SMC 3",
                "intervention_type": "SP+AQ",
                "target_population": ["POP_UNDER_5"],
                "metrics": {
                    "POPULATION": "1000",
                    "POP_UNDER_5": "200",
                },
                "cost_lines": [
                    {
                        "line_name": "SMC3 3-11",
                        "unit_name": "per SPAQ pack 3-11 month olds",
                        "ratio": "0.54",
                        "population_metric_code": "POP_UNDER_5",
                        "unit_cost": "1.00",
                        "yearly_value": "1",
                    },
                    {
                        "line_name": "SMC3 12-59",
                        "unit_name": "per SPAQ pack 12-59 month olds",
                        "ratio": "2.31",
                        "population_metric_code": "POP_UNDER_5",
                        "unit_cost": "1.00",
                        "yearly_value": "1",
                    },
                ],
            }
        )

    def test_compare_smc_4_quantification(self):
        self._compare_single_intervention(
            {
                "intervention_code": "smc_4",
                "intervention_name": "SMC 4",
                "intervention_type": "SP+AQ",
                "target_population": ["POP_UNDER_5"],
                "metrics": {
                    "POPULATION": "1000",
                    "POP_UNDER_5": "200",
                },
                "cost_lines": [
                    {
                        "line_name": "SMC4 3-11",
                        "unit_name": "per SPAQ pack 3-11 month olds",
                        "ratio": "0.72",
                        "population_metric_code": "POP_UNDER_5",
                        "unit_cost": "1.00",
                        "yearly_value": "1",
                    },
                    {
                        "line_name": "SMC4 12-59",
                        "unit_name": "per SPAQ pack 12-59 month olds",
                        "ratio": "3.08",
                        "population_metric_code": "POP_UNDER_5",
                        "unit_cost": "1.00",
                        "yearly_value": "1",
                    },
                ],
            }
        )

    def test_compare_smc_5_quantification(self):
        self._compare_single_intervention(
            {
                "intervention_code": "smc_5",
                "intervention_name": "SMC 5",
                "intervention_type": "SP+AQ",
                "target_population": ["POP_UNDER_5"],
                "metrics": {
                    "POPULATION": "1000",
                    "POP_UNDER_5": "200",
                },
                "cost_lines": [
                    {
                        "line_name": "SMC5 3-11",
                        "unit_name": "per SPAQ pack 3-11 month olds",
                        "ratio": "0.9",
                        "population_metric_code": "POP_UNDER_5",
                        "unit_cost": "1.00",
                        "yearly_value": "1",
                    },
                    {
                        "line_name": "SMC5 12-59",
                        "unit_name": "per SPAQ pack 12-59 month olds",
                        "ratio": "3.85",
                        "population_metric_code": "POP_UNDER_5",
                        "unit_cost": "1.00",
                        "yearly_value": "1",
                    },
                ],
            }
        )

    def test_compare_pmc_quantification(self):
        self._compare_single_intervention(
            {
                "intervention_code": "pmc",
                "intervention_name": "PMC",
                "intervention_type": "SP",
                "target_population": ["POP_0_1_Y", "POP_1_2_Y"],
                "metrics": {
                    "POPULATION": "1000",
                    "POP_0_1_Y": "50",
                    "POP_1_2_Y": "0",
                },
                "cost_lines": [
                    {
                        "line_name": "PMC SP",
                        "unit_name": "per SP",
                        "ratio": "3",
                        "population_metric_code": "POP_0_1_Y",
                        "unit_cost": "2.50",
                        "yearly_value": "0.85",
                    },
                ],
            }
        )

    def test_compare_vacc_quantification(self):
        self._compare_single_intervention(
            {
                "intervention_code": "vacc",
                "intervention_name": "R21",
                "intervention_type": "R21",
                "target_population": ["POP_5_36_M"],
                "assert_delta": "0.2",
                "metrics": {
                    "POPULATION": "1000",
                    "POP_5_36_M": "120",
                },
                "cost_lines": [
                    {
                        "line_name": "Vacc doses",
                        "unit_name": "per dose",
                        "ratio": "4",
                        "population_metric_code": "POP_5_36_M",
                        "unit_cost": "1.20",
                        "yearly_value": "0.84",
                    },
                    {
                        "line_name": "Vacc children",
                        "unit_name": "per child",
                        "ratio": "1",
                        "population_metric_code": "POP_5_36_M",
                        "unit_cost": "0.40",
                        "yearly_value": "0.7636363636363636",
                    },
                ],
            }
        )
