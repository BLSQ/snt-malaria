import { InterventionOrgUnit } from './interventions';
import { MetricType } from './metrics';

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
    HEIGHTY_PERCENT = 'heighty_percent',
}

export type InterventionPlanBudgetRequest = {
    interventionId: number;
    orgUnits: InterventionOrgUnit[];
    coverage?: InterventionCostCoverage;
};
