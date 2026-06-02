from decimal import Decimal

from pydantic import BaseModel, Field, field_serializer


class BudgetBaseModel(BaseModel):
    # This base model is used to ensure that all Decimal fields are serialized as floats in JSON responses
    @field_serializer("*", when_used="json", check_fields=False)
    def serialize_decimal(self, value):
        return float(value) if isinstance(value, Decimal) else value


class BudgetBreakdownItem(BudgetBaseModel):
    id: int
    category: str
    cost_class: str
    total_cost: Decimal = Decimal("0.0")
    quantity: Decimal = Decimal("0.0")


class BudgetInterventionItem(BudgetBaseModel):
    id: int
    code: str
    type: str
    total_cost: Decimal = Decimal("0.0")
    total_pop: Decimal = Decimal("0.0")
    quantity: Decimal = Decimal("0.0")
    cost_breakdown: list[BudgetBreakdownItem] = Field(default_factory=list)


class BudgetOrgUnitInterventionItem(BudgetBaseModel):
    id: int
    code: str
    type: str
    total_cost: Decimal = Decimal("0.0")
    quantity: Decimal = Decimal("0.0")
    cost_breakdown: list[BudgetBreakdownItem] = Field(default_factory=list)


class BudgetOrgUnitItem(BudgetBaseModel):
    org_unit_id: int
    total_cost: Decimal = Decimal("0.0")
    quantity: Decimal = Decimal("0.0")
    interventions: list[BudgetOrgUnitInterventionItem] = Field(default_factory=list)


class BudgetYearResult(BudgetBaseModel):
    year: int
    total_cost: Decimal
    quantity: Decimal
    interventions: list[BudgetInterventionItem]
    org_units_costs: list[BudgetOrgUnitItem]
    category_costs: list[BudgetBreakdownItem]


class BudgetLineRow(BudgetBaseModel):
    cost_line_id: int
    org_unit_id: int
    intervention_id: int
    category: str
    cost_class: str
    population: Decimal
    quantity: Decimal
    total_cost: Decimal
