from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field, field_serializer


class BudgetBaseModel(BaseModel):
    # This base model is used to ensure that all Decimal fields are serialized as floats in JSON responses
    @field_serializer("*", when_used="json", check_fields=False)
    def serialize_decimal(self, value):
        return float(value) if isinstance(value, Decimal) else value


class BudgetBreakdownItem(BudgetBaseModel):
    id: Optional[int] = None
    category: str
    total_cost: Decimal = Decimal("0.0")
    quantity: Decimal = Decimal("0.0")
    population: Decimal = Decimal("0.0")
    unit_cost: Optional[Decimal] = None
    cost_unit_name: Optional[str] = None
    conversion_factor: Optional[float] = None
    invert_conversion_factor: Optional[bool] = False
    target_population: Optional[str] = None
    buffer: Optional[float] = None


class BudgetInterventionItem(BudgetBaseModel):
    id: int
    code: str
    type: str
    total_cost: Decimal = Decimal("0.0")
    cost_breakdown: list[BudgetBreakdownItem] = Field(default_factory=list)


class BudgetOrgUnitInterventionItem(BudgetBaseModel):
    id: int
    code: str
    type: str
    total_cost: Decimal = Decimal("0.0")
    cost_breakdown: list[BudgetBreakdownItem] = Field(default_factory=list)


class BudgetOrgUnitItem(BudgetBaseModel):
    org_unit_id: int
    total_cost: Decimal = Decimal("0.0")
    interventions: list[BudgetOrgUnitInterventionItem] = Field(default_factory=list)


class BudgetYearResult(BudgetBaseModel):
    year: int
    total_cost: Decimal
    interventions: list[BudgetInterventionItem]
    org_units_costs: list[BudgetOrgUnitItem]
    category_costs: list[BudgetBreakdownItem]


class BudgetLineRow(BudgetBaseModel):
    cost_line_id: int
    org_unit_id: Optional[int]
    intervention_id: int
    category: str
    population: Decimal = Decimal("0")
    quantity: Decimal
    total_cost: Decimal
    grant_id: Optional[int]


class BudgetGrantYearCost(BudgetBaseModel):
    year: int
    total_cost: Decimal = Decimal("0.0")


class BudgetGrantCostItem(BudgetBaseModel):
    grant_id: Optional[int] = None
    name: Optional[str] = None
    short_name: Optional[str] = None
    amount: Optional[Decimal] = None
    total_cost: Decimal = Decimal("0.0")
    yearly_costs: list[BudgetGrantYearCost] = Field(default_factory=list)
