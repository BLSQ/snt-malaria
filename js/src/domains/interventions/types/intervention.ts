import { InterventionCostBreakdownLine } from './interventionCostBreakdownLine';

export type Intervention = {
    id: number;
    name: string;
    short_name: string;
    code: string;
    description: string;
    intervention_category: number;
};
export type InterventionDetails = {
    id: number;
    name: string;
    code: string;
    impact_ref: string;
    cost_breakdown_lines: InterventionCostBreakdownLine[];
};
