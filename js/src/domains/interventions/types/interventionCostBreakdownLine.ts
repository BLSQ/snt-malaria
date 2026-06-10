export type InterventionCostBreakdownLine = {
    name: string;
    category: string;
    category_label: string;
    unit_type: string;
    unit_type_label: string;
    unit_cost: number;
    id: number;
    intervention: number;
    population_layer: number | null;
    cost_driver: 'population' | 'fixed_cost';
};
