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

export type InterventionPlanMetrics = {
    interventionId: number;
    orgUnits: InterventionOrgUnit[];
    metricType?: MetricType;
};
