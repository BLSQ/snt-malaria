import { InterventionOrgUnit } from './interventions';

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
    cost: number;
    category: string;
    cost_class: string;
    name: string;
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
    cost_input: any; // TODO Define this
    assumptions: { [key: string]: string | number };
    results: Budget[];
};
