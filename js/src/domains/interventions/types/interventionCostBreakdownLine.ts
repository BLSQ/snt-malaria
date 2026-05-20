export type InterventionCostBreakdownLine = {
    name: string;
    category: string;
    category_label: string;
    unit_type: string;
    unit_type_label: string;
    unit_cost: string; // using string to avoid float precision issues
    id: number;
    intervention: number;
    population_layer: string | null;
};
