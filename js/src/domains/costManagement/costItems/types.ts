import {
    Intervention,
    InterventionCategory,
    InterventionCostBreakdownLine,
} from '../../interventions/types';

export type CostItemGroup = {
    intervention: Intervention;
    interventionCategory: InterventionCategory;
    lines: InterventionCostBreakdownLine[];
};

export type CostItemFilters = {
    search: string;
    interventionCategoryId: number | null;
};

export type LineHandler = (line: InterventionCostBreakdownLine) => void;

export type PartialLineHandler = (
    lineId: number,
    changes: Partial<InterventionCostBreakdownLine>,
) => void;
