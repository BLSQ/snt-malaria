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
    population_layer_label: string | null;
    is_proportional: boolean;
    conversion_factor: number | string;
    invert_conversion_factor: boolean;
    coverage: number | string;
    // Percentage; null uses the budget settings buffer.
    buffer: number | string | null;
};

export type InterventionCostBreakdownLinePayload = Omit<
    InterventionCostBreakdownLine,
    'id' | 'category_label' | 'unit_type_label' | 'population_layer_label'
> & { id?: number };
