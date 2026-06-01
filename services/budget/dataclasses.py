from dataclasses import dataclass, field
from decimal import Decimal


@dataclass
class BudgetBreakdownItem:
    id: int
    category: str
    cost_class: str
    total_cost: Decimal = Decimal("0.0")
    quantity: Decimal = Decimal("0.0")


@dataclass
class BudgetInterventionItem:
    id: int
    code: str
    type: str
    total_cost: Decimal = Decimal("0.0")
    total_pop: Decimal = Decimal("0.0")
    quantity: Decimal = Decimal("0.0")
    cost_breakdown: list[BudgetBreakdownItem] = field(default_factory=list)


@dataclass
class BudgetOrgUnitInterventionItem:
    id: int
    code: str
    type: str
    total_cost: Decimal = Decimal("0.0")
    quantity: Decimal = Decimal("0.0")
    cost_breakdown: list[BudgetBreakdownItem] = field(default_factory=list)


@dataclass
class BudgetOrgUnitItem:
    org_unit_id: int
    total_cost: Decimal = Decimal("0.0")
    quantity: Decimal = Decimal("0.0")
    interventions: list[BudgetOrgUnitInterventionItem] = field(default_factory=list)


@dataclass
class BudgetYearResult:
    year: int
    total_cost: Decimal
    quantity: Decimal
    interventions: list[BudgetInterventionItem]
    org_units_costs: list[BudgetOrgUnitItem]
    category_costs: list[BudgetBreakdownItem]


@dataclass
class BudgetLineRow:
    cost_line_id: int
    org_unit_id: int
    intervention_id: int
    category: str
    cost_class: str
    population: Decimal
    quantity: Decimal
    total_cost: Decimal
