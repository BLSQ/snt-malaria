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
    is_proportional: boolean;
    conversion_factor: number | string;
    invert_conversion_factor: boolean;
};
