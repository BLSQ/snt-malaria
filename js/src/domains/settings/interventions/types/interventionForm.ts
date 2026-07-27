import { InterventionCostBreakdownLine } from '../../../interventions/types';

export type InterventionFormValues = {
    id?: number;
    intervention_category: number | null;
    name: string;
    short_name: string;
    code: string;
    description: string;
    impact_ref: string;
    grant: number | null;
    cost_breakdown_lines: InterventionCostBreakdownLine[];
};
