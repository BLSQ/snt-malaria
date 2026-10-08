from collections import defaultdict
from decimal import Decimal
from typing import Any, Optional

from iaso.models import MetricValue
from plugins.snt_malaria.models import (
    Budget,
    BudgetSettings,
    Grant,
    InterventionCostBreakdownLine,
    ScenarioRuleCostOverride,
    ScenarioRuleIntervention,
)
from plugins.snt_malaria.models.cost_breakdown import compute_conversion_ratio

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
    proportional lines: quantity = population * coverage * conversion_ratio * buffer
    fixed lines:        quantity = coverage (the yearly quantity) * buffer
    total_cost = quantity * unit_cost * (1 + inflation_rate)^(year - start_year)

    Each assignment is costed with the values of the rule that produced it: a cost line value
    resolves from the rule's override for that year, then its all-years override, then the cost
    line itself. A year the rule does not deploy the intervention in has no coverage unless the
    rule sets one for that year.
    """

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
        self.cost_line_by_id = {}
        metric_type_ids = set()
        for line in population_cost_lines:
            self.cost_lines_by_intervention_id[line.intervention_id].append(line)
            self.cost_line_by_id[line.id] = line
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

        rule_interventions = list(
            ScenarioRuleIntervention.objects.filter(scenario_rule__scenario=scenario).select_related("scenario_rule")
        )
        self.rule_intervention_by_key = {
            (rule_intervention.scenario_rule_id, rule_intervention.intervention_id): rule_intervention
            for rule_intervention in rule_interventions
        }
        self.override_by_key = {
            (override.rule_intervention_id, override.cost_line_id, override.year): override
            for override in ScenarioRuleCostOverride.objects.filter(rule_intervention__in=rule_interventions)
        }
        self.fixed_cost_candidates_by_intervention_id = self._fixed_cost_candidates(rule_interventions)

        budget_settings = BudgetSettings.objects.filter(account=scenario.account).first()
        self.inflation_rate = Decimal(str(budget_settings.inflation_rate)) if budget_settings else Decimal("0")
        self.buffer = Decimal(str(budget_settings.buffer)) if budget_settings else Decimal("1.1")

    def _fixed_cost_candidates(self, rule_interventions):
        """Per intervention, the rule interventions eligible to cost its fixed lines, highest priority first.

        Only rules that ended up with assignments qualify. ``None`` stands for assignments made
        outside of any rule, which use the cost line values.
        """
        assigned_keys = {(assignment.rule_id, assignment.intervention_id) for assignment in self.assignments}
        candidates = defaultdict(list)
        for rule_intervention in sorted(rule_interventions, key=lambda ri: ri.scenario_rule.priority, reverse=True):
            if (rule_intervention.scenario_rule_id, rule_intervention.intervention_id) in assigned_keys:
                candidates[rule_intervention.intervention_id].append(rule_intervention)
        interventions_assigned_outside_rules = {
            intervention_id
            for rule_id, intervention_id in assigned_keys
            if (rule_id, intervention_id) not in self.rule_intervention_by_key
        }
        for intervention_id in interventions_assigned_outside_rules:
            candidates[intervention_id].append(None)
        return candidates

    def calculate_and_save_all_years(self, user):
        all_years_results = self.calculate_all_years()
        return Budget.objects.create(
            scenario=self.scenario,
            name=f"Budget for {self.scenario.name}",
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

    @staticmethod
    def _default_breakdown_entry():
        """Fresh, empty accumulator for one cost line's contribution to a breakdown (by intervention,
        or by org unit + intervention -- both use this same shape)."""
        return {
            "id": None,
            "category": None,
            "total_cost": Decimal("0"),
            "quantity": Decimal("0"),
            "population": Decimal("0"),
            "unit_cost": None,
            "cost_unit_name": None,
            "conversion_factor": None,
            "invert_conversion_factor": False,
            "target_population": None,
            "target_population_layer_id": None,
            "is_proportional": False,
            "yearly_value": Decimal("0"),
            "buffer": None,
        }

    def _buffer_multiplier(self, buffer_percentage):
        if buffer_percentage is None:
            return self.buffer
        return Decimal("1") + buffer_percentage / Decimal("100")

    def _populate_breakdown_from_cost_line(self, entry, cost_line):
        """Fills in a breakdown entry's cost-line-derived (as opposed to accumulated) fields."""
        entry["unit_cost"] = cost_line.unit_cost
        entry["cost_unit_name"] = cost_line.unit_type.name if cost_line.unit_type else None
        entry["conversion_factor"] = cost_line.conversion_factor
        entry["invert_conversion_factor"] = cost_line.invert_conversion_factor
        entry["target_population"] = cost_line.population_layer.name if cost_line.population_layer else None
        entry["target_population_layer_id"] = cost_line.population_layer.id if cost_line.population_layer else None
        entry["is_proportional"] = cost_line.is_proportional
        entry["buffer"] = float(self._buffer_multiplier(cost_line.buffer))

    def calculate_year(self, year):
        """Calculate the budget for a given year, based on the population-driven formula and the scenario data.
        The calculation is done in several steps:
        1. Compute the raw breakdown lines for the year, based on the population and the coverage and unit costs resolved from rule overrides, applying the inflation rate.
        2. Aggregate the breakdown lines by intervention, org unit and category, to compute the totals for each level and the breakdown of costs by category for each intervention and org unit.
        3. Build the final list of interventions with their cost breakdown, the list of org units with their interventions and breakdown, and the list of category costs, filtering out items with total cost <= 0.

        return a BudgetYearResult object containing the total cost and quantity for the year, as well as the detailed breakdown by intervention, org unit and category.
        """
        rows = self._compute_breakdown_line_rows(year)

        intervention_totals = defaultdict(lambda: {"total_cost": Decimal("0")})
        intervention_breakdowns = defaultdict(lambda: defaultdict(self._default_breakdown_entry))

        org_unit_totals = defaultdict(lambda: {"total_cost": Decimal("0")})
        org_unit_intervention_totals = defaultdict(lambda: defaultdict(lambda: {"total_cost": Decimal("0")}))
        org_unit_intervention_breakdowns = defaultdict(
            lambda: defaultdict(lambda: defaultdict(self._default_breakdown_entry))
        )

        category_totals = defaultdict(lambda: {"id": None, "total_cost": Decimal("0"), "quantity": Decimal("0")})

        total_cost = Decimal("0")

        for row in rows:
            intervention_id = row.intervention_id

            intervention_totals[intervention_id]["total_cost"] += row.total_cost
            bd = intervention_breakdowns[intervention_id][row.cost_line_id]
            bd["id"] = row.cost_line_id
            bd["category"] = row.category
            bd["total_cost"] += row.total_cost
            bd["quantity"] += row.quantity
            bd["population"] += row.population
            if bd["unit_cost"] is None:
                cost_line = self.cost_line_by_id.get(row.cost_line_id)
                if cost_line:
                    self._populate_breakdown_from_cost_line(bd, cost_line)
                    bd["yearly_value"] = row.yearly_value

            if row.org_unit_id is not None:
                org_unit_totals[row.org_unit_id]["total_cost"] += row.total_cost
                org_unit_intervention_totals[row.org_unit_id][intervention_id]["total_cost"] += row.total_cost
                ou_bd = org_unit_intervention_breakdowns[row.org_unit_id][intervention_id][row.cost_line_id]
                ou_bd["id"] = row.cost_line_id
                ou_bd["category"] = row.category
                ou_bd["total_cost"] += row.total_cost
                ou_bd["quantity"] += row.quantity
                ou_bd["population"] += row.population
                if ou_bd["unit_cost"] is None:
                    cost_line = self.cost_line_by_id.get(row.cost_line_id)
                    if cost_line:
                        self._populate_breakdown_from_cost_line(ou_bd, cost_line)
                        ou_bd["yearly_value"] = row.yearly_value

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
        Population-based lines produce one row per assignment, fixed lines one row per scenario.
        Lines without population or coverage for the year are skipped.
        """

        rows = []
        years_offset = year - self.start_year
        inflation_multiplier = (Decimal("1") + self.inflation_rate) ** years_offset
        for assignment in self.assignments:
            intervention = assignment.intervention
            rule_intervention = self.rule_intervention_by_key.get((assignment.rule_id, intervention.id))
            grant_id = assignment.grant_id or intervention.grant_id

            for line in self.cost_lines_by_intervention_id.get(intervention.id, []):
                if not line.is_proportional:
                    continue
                row = self._compute_population_cost_row(
                    line, rule_intervention, assignment.org_unit_id, year, inflation_multiplier, grant_id
                )
                if row:
                    rows.append(row)

        rows.extend(self._compute_fixed_cost_rows(year, inflation_multiplier))
        return rows

    def _override_value(self, field, rule_intervention, line, year):
        if rule_intervention is None:
            return None
        override = self.override_by_key.get((rule_intervention.id, line.id, year))
        return getattr(override, field) if override else None

    def _resolve(self, field, rule_intervention, line, year):
        """Value of a cost line field for a rule and year: year override, then all-years override, then the line."""
        for override_year in (year, None):
            value = self._override_value(field, rule_intervention, line, override_year)
            if value is not None:
                return value
        return getattr(line, field)

    def _coverage(self, rule_intervention, line, year):
        """Coverage percentage for proportional lines, quantity for fixed lines."""
        year_coverage = self._override_value("coverage", rule_intervention, line, year)
        if year_coverage is not None:
            return year_coverage
        if rule_intervention is not None and not rule_intervention.is_deployed_in(year):
            return Decimal("0")
        return self._resolve("coverage", rule_intervention, line, year)

    def _compute_population_cost_row(self, line, rule_intervention, org_unit_id, year, inflation_multiplier, grant_id):
        """
        Calculate using population as quantity and the coverage as a ratio applied on this quantity.
        """
        if line.population_layer_id is None:
            return None

        population = self.population_by_key.get((org_unit_id, year, line.population_layer_id), Decimal("0"))
        if population <= 0:
            return None

        coverage_ratio = self._coverage(rule_intervention, line, year) / Decimal("100")
        if coverage_ratio <= 0:
            return None

        conversion_ratio = compute_conversion_ratio(
            True,
            self._resolve("conversion_factor", rule_intervention, line, year),
            line.invert_conversion_factor,
        )
        buffer_multiplier = self._buffer_multiplier(self._resolve("buffer", rule_intervention, line, year))
        # The buffer is baked into the quantity (procurement over-ordering), so the
        # exposed quantity reflects what actually needs to be procured.
        quantity = population * coverage_ratio * conversion_ratio * buffer_multiplier
        line_cost = self._compute_cost_(
            quantity, self._resolve("unit_cost", rule_intervention, line, year), inflation_multiplier
        )

        if line_cost <= 0:
            return None

        return BudgetLineRow(
            cost_line_id=line.id,
            org_unit_id=org_unit_id,
            intervention_id=line.intervention_id,
            category=line.get_category_display(),
            population=population,
            is_proportional=line.is_proportional,
            yearly_value=coverage_ratio,
            quantity=quantity,
            total_cost=line_cost,
            grant_id=grant_id,
        )

    def _compute_fixed_cost_rows(self, year, inflation_multiplier):
        """
        Fixed lines cost their quantity once per scenario, with the values of the highest-priority
        rule that costs a quantity that year.
        """
        rows = []
        for intervention_id, candidates in self.fixed_cost_candidates_by_intervention_id.items():
            for line in self.cost_lines_by_intervention_id.get(intervention_id, []):
                if line.is_proportional:
                    continue
                for rule_intervention in candidates:
                    fixed_quantity = self._coverage(rule_intervention, line, year)
                    if fixed_quantity > 0:
                        row = self._compute_fixed_cost_row(
                            line, rule_intervention, fixed_quantity, year, inflation_multiplier
                        )
                        if row:
                            rows.append(row)
                        break
        return rows

    def _compute_fixed_cost_row(self, line, rule_intervention, fixed_quantity, year, inflation_multiplier):
        quantity = fixed_quantity * self._buffer_multiplier(self._resolve("buffer", rule_intervention, line, year))
        line_cost = self._compute_cost_(
            quantity, self._resolve("unit_cost", rule_intervention, line, year), inflation_multiplier
        )
        if line_cost <= 0:
            return None

        rule_grant_id = rule_intervention.grant_id if rule_intervention else None
        return BudgetLineRow(
            cost_line_id=line.id,
            org_unit_id=None,
            intervention_id=line.intervention_id,
            category=line.get_category_display(),
            is_proportional=line.is_proportional,
            yearly_value=fixed_quantity,
            quantity=quantity,
            total_cost=line_cost,
            grant_id=rule_grant_id or line.intervention.grant_id,
        )

    def _compute_cost_(self, quantity, unit_cost, inflation_multiplier):
        # Buffer is already included in ``quantity``; only unit cost and inflation apply here.
        return quantity * Decimal(str(unit_cost)) * inflation_multiplier

    def _build_breakdown_items(self, breakdown_dict):
        """
        Turns one intervention's (or one org-unit + intervention's) accumulated breakdown dict
        into the sorted, positive-cost `BudgetBreakdownItem` list the API response exposes.
        """
        return [
            BudgetBreakdownItem(
                id=bd["id"],
                category=bd["category"],
                total_cost=bd["total_cost"],
                quantity=bd["quantity"],
                population=bd["population"],
                unit_cost=bd["unit_cost"],
                cost_unit_name=bd["cost_unit_name"],
                conversion_factor=bd["conversion_factor"],
                invert_conversion_factor=bd["invert_conversion_factor"],
                target_population=bd["target_population"],
                target_population_layer_id=bd["target_population_layer_id"],
                is_proportional=bd["is_proportional"],
                yearly_value=bd["yearly_value"],
                buffer=bd["buffer"],
            )
            for _, bd in sorted(breakdown_dict.items(), key=lambda x: x[0])
            if bd["total_cost"] > 0
        ]

    def _build_interventions(self, intervention_totals, intervention_breakdowns):
        """
        Build the list of interventions with their cost breakdown, based on the computed totals and breakdowns.
        Interventions with total cost <= 0 are filtered out, as well as breakdown items with total cost <= 0.
        """
        interventions = []
        for intervention_id, totals in sorted(intervention_totals.items(), key=lambda x: x[0]):
            breakdown_items = self._build_breakdown_items(intervention_breakdowns[intervention_id])
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
                breakdown_items = self._build_breakdown_items(
                    org_unit_intervention_breakdowns[org_unit_id][intervention_id]
                )
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
