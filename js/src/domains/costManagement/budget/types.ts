import {
    Intervention,
    InterventionCategory,
    InterventionCostBreakdownLine,
} from '../../interventions/types';

export type CostItemGroup = {
    intervention: Intervention;
    interventionCategory: InterventionCategory;
    // Every line of the intervention: saving sends the full list, so filtering must never drop lines from it.
    lines: InterventionCostBreakdownLine[];
    visibleLines: InterventionCostBreakdownLine[];
};

export type CostItemFilters = {
    search: string;
    interventionCategoryId: number | null;
};
