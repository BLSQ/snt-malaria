import { InterventionOrgUnit } from './interventionAssignments';

export type Budget = {
    year: number;
    interventions: BudgetIntervention[];
    org_units_costs: BudgetOrgUnit[];
};

export type BudgetOrgUnit = {
    org_unit_id: number;
    total_cost: number;
    interventions: BudgetIntervention[];
};

export type BudgetIntervention = {
    id: number;
    type: string;
    code: string;
    total_cost: number;
    cost_breakdown: BudgetInterventionCostLine[];
};

export type BudgetInterventionCostLine = {
    total_cost: number;
    category: string;
    name: string;
    id: number;
    unit_cost: number | null;
    cost_unit_name: string | null;
    conversion_factor: number | null;
    invert_conversion_factor: boolean;
    target_population: string | null;
    buffer: number | null;
};

export enum InterventionCostCoverage {
    HUNDRED_PERCENT = 'hundred_percent',
    EIGHTY_PERCENT = 'eighty_percent',
}

export type BudgetCalculationRequest = {
    interventionId: number;
    orgUnits: InterventionOrgUnit[];
    coverage?: InterventionCostCoverage;
};

export type BudgetCalculationResponse = {
    id: number;
    scenario: number;
    results: Budget[];
};

export type BudgetGrantYearCost = {
    year: number;
    total_cost: number;
};

export type BudgetGrantCost = {
    grant_id: number | null;
    name: string | null;
    short_name: string | null;
    amount: number | null;
    total_cost: number;
    yearly_costs: BudgetGrantYearCost[];
};

export type BudgetByGrantResponse = {
    scenario_id: number;
    grant_costs: BudgetGrantCost[];
};
