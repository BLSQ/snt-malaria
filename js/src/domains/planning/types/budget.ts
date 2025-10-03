import { InterventionOrgUnit } from './interventions';

export type Budget = {
    year: number;
    interventions: BudgetIntervention[];
};

export type BudgetIntervention = {
    name: string;
    cost: number;
    costBreakdown: BudgetInterventionCostLine[];
};

export type BudgetInterventionCostLine = {
    cost: number;
    category: string;
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
    scenarioId: number;
    scenarioName: string;
    status: string;
    total_budget: number;
    intervention_budget: Budget[];
};
