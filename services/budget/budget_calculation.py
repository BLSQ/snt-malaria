from collections import defaultdict
from decimal import Decimal

from iaso.models import MetricValue
from plugins.snt_malaria.models import (
    Budget,
    BudgetSettings,
    InterventionCostBreakdownLine,
    ScenarioYearlyCostAssignment,
)

from .dataclasses import (
    BudgetBreakdownItem,
    BudgetInterventionItem,
    BudgetLineRow,
    BudgetOrgUnitInterventionItem,
    BudgetOrgUnitItem,
    BudgetYearResult,
)


class BudgetCalculationService:
    """Compute scenario budget using internal population-driven formula.

    Implemented formula:
    population * yearly_assignment_value * cost_unit_ratio * cost_line_unit_cost

    Only population-driven cost lines are processed in this first version.
    """

    buffer = Decimal("1.1")

    def __init__(self, scenario):
        self.scenario = scenario
        self.start_year = scenario.start_year
        self.end_year = scenario.end_year

        self.assignments = list(
            scenario.intervention_assignments.select_related("intervention", "org_unit")
            .all()
            .order_by("org_unit_id", "intervention_id")
        )
        self.intervention_meta_by_id = {}
        intervention_ids = set()
        org_unit_ids = set()
        for assignment in self.assignments:
            self.intervention_meta_by_id[assignment.intervention_id] = {
                "code": assignment.intervention.code,
                "type": assignment.intervention.short_name,
            }
            intervention_ids.add(assignment.intervention_id)
            org_unit_ids.add(assignment.org_unit_id)

        population_cost_lines = list(
            InterventionCostBreakdownLine.objects.filter(
                intervention_id__in=intervention_ids,
                cost_driver=InterventionCostBreakdownLine.CostDriver.POPULATION,
            )
            .select_related("population_layer", "unit_type", "intervention")
            .order_by("intervention_id", "id")
        )

        self.cost_lines_by_intervention_id = defaultdict(list)
        cost_line_ids = []
        metric_type_ids = set()
        for line in population_cost_lines:
            self.cost_lines_by_intervention_id[line.intervention_id].append(line)
            cost_line_ids.append(line.id)
            if line.population_layer_id is not None:
                metric_type_ids.add(line.population_layer_id)

        metric_values = MetricValue.objects.filter(
            org_unit_id__in=org_unit_ids,
            year__gte=self.start_year,
            year__lte=self.end_year,
            metric_type_id__in=metric_type_ids,
        ).values("org_unit_id", "year", "metric_type_id", "value")
        self.population_by_key = {
            (row["org_unit_id"], row["year"], row["metric_type_id"]): Decimal(str(row["value"]))
            for row in metric_values
        }

        yearly_assignments = ScenarioYearlyCostAssignment.objects.filter(
            scenario=scenario,
            year__gte=self.start_year,
            year__lte=self.end_year,
            cost_line_id__in=cost_line_ids,
        ).values("cost_line_id", "year", "value")

        self.yearly_value_by_key = {
            (row["cost_line_id"], row["year"]): Decimal(str(row["value"])) for row in yearly_assignments
        }

        budget_settings = BudgetSettings.objects.filter(account=scenario.account).first()
        self.inflation_rate = Decimal(str(budget_settings.inflation_rate)) if budget_settings else Decimal("0")

    def calculate_and_save_all_years(self, user):
        all_years_results = self.calculate_all_years()
        return Budget.objects.create(
            scenario=self.scenario,
            name=f"Budget for {self.scenario.name}",
            cost_input={},
            population_input={},
            assumptions={},
            results=[budget_result.model_dump(mode="json") for budget_result in all_years_results],
            created_by=user,
            updated_by=user,
        )

    def calculate_all_years(self):
        return [self.calculate_year(year) for year in range(self.start_year, self.end_year + 1)]

    def calculate_year(self, year):
        """Calculate the budget for a given year, based on the population-driven formula and the scenario data.
        The calculation is done in several steps:
        1. Compute the raw breakdown lines for the year, based on the population, yearly assignment values and cost line unit costs, applying the inflation rate.
        2. Aggregate the breakdown lines by intervention, org unit and category, to compute the totals for each level and the breakdown of costs by category for each intervention and org unit.
        3. Build the final list of interventions with their cost breakdown, the list of org units with their interventions and breakdown, and the list of category costs, filtering out items with total cost <= 0.

        return a BudgetYearResult object containing the total cost and quantity for the year, as well as the detailed breakdown by intervention, org unit and category.
        """
        rows = self._compute_breakdown_line_rows(year)

        intervention_totals = defaultdict(
            lambda: {"total_cost": Decimal("0"), "total_pop": Decimal("0"), "quantity": Decimal("0")}
        )
        intervention_breakdowns = defaultdict(
            lambda: defaultdict(
                lambda: {"id": None, "category": None, "total_cost": Decimal("0"), "quantity": Decimal("0")}
            )
        )

        org_unit_totals = defaultdict(lambda: {"total_cost": Decimal("0"), "quantity": Decimal("0")})
        org_unit_intervention_totals = defaultdict(
            lambda: defaultdict(lambda: {"total_cost": Decimal("0"), "quantity": Decimal("0")})
        )
        org_unit_intervention_breakdowns = defaultdict(
            lambda: defaultdict(
                lambda: defaultdict(
                    lambda: {"id": None, "category": None, "total_cost": Decimal("0"), "quantity": Decimal("0")}
                )
            )
        )

        category_totals = defaultdict(lambda: {"id": None, "total_cost": Decimal("0"), "quantity": Decimal("0")})

        total_cost = Decimal("0")
        total_quantity = Decimal("0")

        for row in rows:
            intervention_id = row.intervention_id

            intervention_totals[intervention_id]["total_cost"] += row.total_cost
            intervention_totals[intervention_id]["total_pop"] += row.population
            intervention_totals[intervention_id]["quantity"] += row.quantity
            intervention_breakdowns[intervention_id][row.cost_line_id]["id"] = row.cost_line_id
            intervention_breakdowns[intervention_id][row.cost_line_id]["category"] = row.category
            intervention_breakdowns[intervention_id][row.cost_line_id]["total_cost"] += row.total_cost
            intervention_breakdowns[intervention_id][row.cost_line_id]["quantity"] += row.quantity

            org_unit_totals[row.org_unit_id]["total_cost"] += row.total_cost
            org_unit_totals[row.org_unit_id]["quantity"] += row.quantity

            org_unit_intervention_totals[row.org_unit_id][intervention_id]["total_cost"] += row.total_cost
            org_unit_intervention_totals[row.org_unit_id][intervention_id]["quantity"] += row.quantity
            org_unit_intervention_breakdowns[row.org_unit_id][intervention_id][row.cost_line_id]["id"] = (
                row.cost_line_id
            )
            org_unit_intervention_breakdowns[row.org_unit_id][intervention_id][row.cost_line_id]["category"] = (
                row.category
            )
            org_unit_intervention_breakdowns[row.org_unit_id][intervention_id][row.cost_line_id]["total_cost"] += (
                row.total_cost
            )
            org_unit_intervention_breakdowns[row.org_unit_id][intervention_id][row.cost_line_id]["quantity"] += (
                row.quantity
            )

            category_totals[row.category]["id"] = row.cost_line_id
            category_totals[row.category]["total_cost"] += row.total_cost
            category_totals[row.category]["quantity"] += row.quantity

            total_cost += row.total_cost
            total_quantity += row.quantity

        interventions = self._build_interventions(intervention_totals, intervention_breakdowns)
        org_units_costs = self._build_org_units_costs(
            org_unit_totals,
            org_unit_intervention_totals,
            org_unit_intervention_breakdowns,
        )
        category_costs = self._build_category_costs(category_totals)

        return BudgetYearResult(
            year=year,
            total_cost=total_cost,
            quantity=total_quantity,
            interventions=interventions,
            org_units_costs=org_units_costs,
            category_costs=category_costs,
        )

    def _compute_breakdown_line_rows(self, year):
        """
        Compute the raw cost breakdown lines for a given year, without any aggregation, to be used as input for the budget calculation.
        Calculation is based on the population-driven formula, only processing cost lines with population as cost driver
        And skipping lines with missing population or yearly per scenario cost values.
        Formula quantity: population * yearly_cost_value * cost_unit_ratio
        Formula total cost: quantity * cost_line_unit_cost * (1 + inflation_rate)^(year - start_year)
        """

        rows = []
        years_offset = year - self.start_year
        inflation_multiplier = (Decimal("1") + self.inflation_rate) ** years_offset
        for assignment in self.assignments:
            intervention = assignment.intervention
            org_unit_id = assignment.org_unit_id

            for line in self.cost_lines_by_intervention_id.get(intervention.id, []):
                if line.population_layer_id is None:
                    continue

                population = self.population_by_key.get((org_unit_id, year, line.population_layer_id), Decimal("0"))
                if population <= 0:
                    continue

                yearly_value = self.yearly_value_by_key.get((line.id, year), Decimal("1"))
                unit_ratio = (
                    line.unit_type.ratio if line.unit_type and line.unit_type.ratio is not None else Decimal("1")
                )

                # Doing the same as before here, quantity is modified by the unit ratio and the yearly coverage.
                quantity = population * yearly_value * Decimal(str(unit_ratio))
                line_cost = quantity * Decimal(str(line.unit_cost)) * inflation_multiplier * self.buffer
                if line_cost <= 0:
                    continue

                category = line.get_category_display()
                rows.append(
                    BudgetLineRow(
                        cost_line_id=line.id,
                        org_unit_id=org_unit_id,
                        intervention_id=intervention.id,
                        category=category,
                        population=population,
                        quantity=quantity,
                        total_cost=line_cost,
                    )
                )

        return rows

    def _build_interventions(self, intervention_totals, intervention_breakdowns):
        """
        Build the list of interventions with their cost breakdown, based on the computed totals and breakdowns.
        Interventions with total cost <= 0 are filtered out, as well as breakdown items with total cost <= 0.
        """
        interventions = []
        for intervention_id, totals in sorted(intervention_totals.items(), key=lambda x: x[0]):
            breakdown_items = [
                BudgetBreakdownItem(
                    id=bd["id"],
                    category=bd["category"],
                    total_cost=bd["total_cost"],
                    quantity=bd["quantity"],
                )
                for _, bd in sorted(intervention_breakdowns[intervention_id].items(), key=lambda x: x[0])
                if bd["total_cost"] > 0
            ]
            if totals["total_cost"] <= 0:
                continue
            intervention_meta = self.intervention_meta_by_id.get(intervention_id, {})
            interventions.append(
                BudgetInterventionItem(
                    id=intervention_id,
                    code=intervention_meta.get("code", ""),
                    type=intervention_meta.get("type", ""),
                    total_cost=totals["total_cost"],
                    total_pop=totals["total_pop"],
                    quantity=totals["quantity"],
                    cost_breakdown=breakdown_items,
                )
            )
        return interventions

    def _build_org_units_costs(
        self,
        org_unit_totals,
        org_unit_intervention_totals,
        org_unit_intervention_breakdowns,
    ):
        """
        Build the list of org units costs with their interventions and breakdown, based on the computed totals and breakdowns.
        Org units with total cost <= 0 are filtered out, as well as interventions and breakdown items with total cost <= 0.
        """
        org_units_costs = []
        for org_unit_id, totals in sorted(org_unit_totals.items(), key=lambda x: x[0]):
            if totals["total_cost"] <= 0:
                continue

            intervention_items = []
            for intervention_id, iv_totals in sorted(
                org_unit_intervention_totals[org_unit_id].items(), key=lambda x: x[0]
            ):
                breakdown_items = [
                    BudgetBreakdownItem(
                        id=bd["id"],
                        category=bd["category"],
                        total_cost=bd["total_cost"],
                        quantity=bd["quantity"],
                    )
                    for _, bd in sorted(
                        org_unit_intervention_breakdowns[org_unit_id][intervention_id].items(), key=lambda x: x[0]
                    )
                    if bd["total_cost"] > 0
                ]
                if iv_totals["total_cost"] <= 0:
                    continue
                intervention_meta = self.intervention_meta_by_id.get(intervention_id, {})

                intervention_items.append(
                    BudgetOrgUnitInterventionItem(
                        id=intervention_id,
                        code=intervention_meta.get("code", ""),
                        type=intervention_meta.get("type", ""),
                        total_cost=iv_totals["total_cost"],
                        quantity=iv_totals["quantity"],
                        cost_breakdown=breakdown_items,
                    )
                )

            org_units_costs.append(
                BudgetOrgUnitItem(
                    org_unit_id=org_unit_id,
                    total_cost=totals["total_cost"],
                    quantity=totals["quantity"],
                    interventions=intervention_items,
                )
            )
        return org_units_costs

    @staticmethod
    def _build_category_costs(category_totals):
        """
        Build the list of category costs based on the computed totals.
        Categories with total cost <= 0 are filtered out.
        """
        return [
            BudgetBreakdownItem(
                id=totals["id"],
                category=category,
                total_cost=totals["total_cost"],
                quantity=totals["quantity"],
            )
            for category, totals in sorted(category_totals.items(), key=lambda x: x[0])
            if totals["total_cost"] > 0
        ]
