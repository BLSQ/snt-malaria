export type InterventionCostBreakdownLine = {
    name: string;
    category: string;
    unit_cost: string; // using string to avoid float precision issues
    id: number;
};
