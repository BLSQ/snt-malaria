from collections import defaultdict
from decimal import Decimal
from typing import Any, Optional

from iaso.models import MetricValue
from plugins.snt_malaria.models import (
    Budget,
    BudgetSettings,
    Grant,
    InterventionCostBreakdownLine,
    ScenarioYearlyCostAssignment,
)

from .dataclasses import (
    BudgetBreakdownItem,
    BudgetGrantCostItem,
    BudgetGrantYearCost,
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
            InterventionCostBreakdownLine.objects.filter(intervention_id__in=intervention_ids)
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

    def calculate_grant_costs(self):
        """Aggregate the budget by grant across all scenario years.

        Each cost row is attributed to the assignment's grant, falling back to
        the intervention's grant. Rows without either are grouped under a
        single "unspecified" item (grant_id None).
        """
        totals: dict[Optional[int], dict[str, Any]] = defaultdict(
            lambda: {"total": Decimal("0"), "by_year": defaultdict(lambda: Decimal("0"))}
        )
        for year in range(self.start_year, self.end_year + 1):
            for row in self._compute_breakdown_line_rows(year):
                totals[row.grant_id]["total"] += row.total_cost
                totals[row.grant_id]["by_year"][year] += row.total_cost

        grant_ids = [grant_id for grant_id in totals if grant_id is not None]
        grants_by_id = {grant.id: grant for grant in Grant.objects.filter(id__in=grant_ids)}

        items = []
        for grant_id, data in totals.items():
            grant = grants_by_id.get(grant_id)
            items.append(
                BudgetGrantCostItem(
                    grant_id=grant_id,
                    name=grant.name if grant else None,
                    short_name=grant.short_name if grant else None,
                    amount=grant.amount if grant else None,
                    total_cost=data["total"],
                    yearly_costs=[
                        BudgetGrantYearCost(year=year, total_cost=cost)
                        for year, cost in sorted(data["by_year"].items())
                    ],
                )
            )
        items.sort(key=lambda item: item.total_cost, reverse=True)
        return items

    def calculate_year(self, year):
        """Calculate the budget for a given year, based on the population-driven formula and the scenario data.
        The calculation is done in several steps:
        1. Compute the raw breakdown lines for the year, based on the population, yearly assignment values and cost line unit costs, applying the inflation rate.
        2. Aggregate the breakdown lines by intervention, org unit and category, to compute the totals for each level and the breakdown of costs by category for each intervention and org unit.
        3. Build the final list of interventions with their cost breakdown, the list of org units with their interventions and breakdown, and the list of category costs, filtering out items with total cost <= 0.

        return a BudgetYearResult object containing the total cost and quantity for the year, as well as the detailed breakdown by intervention, org unit and category.
        """
        rows = self._compute_breakdown_line_rows(year)

        intervention_totals = defaultdict(lambda: {"total_cost": Decimal("0")})
        intervention_breakdowns = defaultdict(
            lambda: defaultdict(
                lambda: {
                    "id": None,
                    "category": None,
                    "total_cost": Decimal("0"),
                    "quantity": Decimal("0"),
                    "population": Decimal("0"),
                }
            )
        )

        org_unit_totals = defaultdict(lambda: {"total_cost": Decimal("0")})
        org_unit_intervention_totals = defaultdict(lambda: defaultdict(lambda: {"total_cost": Decimal("0")}))
        org_unit_intervention_breakdowns = defaultdict(
            lambda: defaultdict(
                lambda: defaultdict(
                    lambda: {
                        "id": None,
                        "category": None,
                        "total_cost": Decimal("0"),
                        "quantity": Decimal("0"),
                        "population": Decimal("0"),
                    }
                )
            )
        )

        category_totals = defaultdict(lambda: {"id": None, "total_cost": Decimal("0"), "quantity": Decimal("0")})

        total_cost = Decimal("0")

        for row in rows:
            intervention_id = row.intervention_id

            intervention_totals[intervention_id]["total_cost"] += row.total_cost
            intervention_breakdowns[intervention_id][row.cost_line_id]["id"] = row.cost_line_id
            intervention_breakdowns[intervention_id][row.cost_line_id]["category"] = row.category
            intervention_breakdowns[intervention_id][row.cost_line_id]["total_cost"] += row.total_cost
            intervention_breakdowns[intervention_id][row.cost_line_id]["quantity"] += row.quantity
            intervention_breakdowns[intervention_id][row.cost_line_id]["population"] += row.population

            if row.org_unit_id is not None:
                org_unit_totals[row.org_unit_id]["total_cost"] += row.total_cost

                org_unit_intervention_totals[row.org_unit_id][intervention_id]["total_cost"] += row.total_cost
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
                org_unit_intervention_breakdowns[row.org_unit_id][intervention_id][row.cost_line_id]["population"] += (
                    row.population
                )

            category_totals[row.category]["id"] = row.cost_line_id
            category_totals[row.category]["total_cost"] += row.total_cost
            category_totals[row.category]["quantity"] += row.quantity

            total_cost += row.total_cost

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
        seen_fixed_cost_line_ids = set()
        years_offset = year - self.start_year
        inflation_multiplier = (Decimal("1") + self.inflation_rate) ** years_offset
        for assignment in self.assignments:
            intervention = assignment.intervention
            org_unit_id = assignment.org_unit_id
            # Grant attribution: the assignment override wins, otherwise fall
            # back to the grant configured on the intervention.
            grant_id = assignment.grant_id or intervention.grant_id

            for line in self.cost_lines_by_intervention_id.get(intervention.id, []):
                lineToAdd = None
                if line.cost_driver == "population":
                    lineToAdd = self._compute_population_cost_row(
                        line, org_unit_id, year, inflation_multiplier, intervention.id, grant_id
                    )
                elif line.cost_driver == "fixed_cost" and line.id not in seen_fixed_cost_line_ids:
                    seen_fixed_cost_line_ids.add(line.id)
                    lineToAdd = self._compute_fixed_cost_row(
                        line, year, inflation_multiplier, intervention.id, grant_id
                    )
                if lineToAdd:
                    rows.append(lineToAdd)
        return rows

    def _get_yearly_value(self, line, year):
        default = Decimal("0") if line.cost_driver == "fixed_cost" else Decimal("1")
        return self.yearly_value_by_key.get((line.id, year), default)

    def _compute_population_cost_row(self, line, org_unit_id, year, inflation_multiplier, intervention_id, grant_id):
        """
        Calculate using population as quantity and yearly value is a ratio applied on this quantity.
        """
        if line.population_layer_id is None:
            return None

        population = self.population_by_key.get((org_unit_id, year, line.population_layer_id), Decimal("0"))
        if population <= 0:
            return None

        yearly_value = self._get_yearly_value(line, year)
        unit_ratio = line.unit_type.ratio if line.unit_type and line.unit_type.ratio is not None else Decimal("1")

        # Doing the same as before here, quantity is modified by the unit ratio and the yearly coverage.
        quantity = population * yearly_value * Decimal(str(unit_ratio))
        line_cost = self._compute_cost_(quantity, line.unit_cost, inflation_multiplier)

        if line_cost <= 0:
            return None

        category = line.get_category_display()
        return BudgetLineRow(
            cost_line_id=line.id,
            org_unit_id=org_unit_id,
            intervention_id=intervention_id,
            category=category,
            population=population,
            quantity=quantity,
            total_cost=line_cost,
            grant_id=grant_id,
        )

    def _compute_fixed_cost_row(self, line, year, inflation_multiplier, intervention_id, grant_id):
        """
        Calculate using yearly value as quantity. Added once per intervention regardless of org units.
        """
        yearly_value = self._get_yearly_value(line, year)
        unit_ratio = line.unit_type.ratio if line.unit_type and line.unit_type.ratio is not None else Decimal("1")
        quantity = yearly_value * Decimal(str(unit_ratio))
        line_cost = self._compute_cost_(quantity, line.unit_cost, inflation_multiplier)
        if line_cost <= 0:
            return None

        category = line.get_category_display()
        return BudgetLineRow(
            cost_line_id=line.id,
            org_unit_id=None,
            intervention_id=intervention_id,
            category=category,
            quantity=quantity,
            total_cost=line_cost,
            grant_id=grant_id,
        )

    def _compute_cost_(self, quantity, unit_cost, inflation_multiplier):
        return quantity * Decimal(str(unit_cost)) * inflation_multiplier * self.buffer

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
                    population=bd["population"],
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
                        population=bd["population"],
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
                        cost_breakdown=breakdown_items,
                    )
                )

            org_units_costs.append(
                BudgetOrgUnitItem(
                    org_unit_id=org_unit_id,
                    total_cost=totals["total_cost"],
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
