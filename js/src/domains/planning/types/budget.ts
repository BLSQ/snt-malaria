import { InterventionOrgUnit } from './interventions';
import { MetricType } from './metrics';

export type Budget = {
    id: number;
    name: string;
    budget: number;
};

export type InterventionPlanMetrics = {
    interventionId: number;
    orgUnits: InterventionOrgUnit[];
    metricType?: MetricType;
};
