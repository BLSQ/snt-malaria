import { useMemo } from 'react';
import { useGetCostBreakdownLines } from '../../../interventions/hooks/useGetCostBreakdownLines';
import { useGetInterventionCategories } from '../../../interventions/hooks/useGetInterventionCategories';
import { InterventionCategory } from '../../../interventions/types';
import { CostItemGroup } from '../types';
import { buildCostItemGroups } from '../utils/costItemGroups';

const NO_CATEGORIES: InterventionCategory[] = [];

export const useCostItemGroups = (): {
    groups: CostItemGroup[];
    interventionCategories: InterventionCategory[];
    isLoading: boolean;
} => {
    const { data: interventionCategories, isLoading: isLoadingCategories } =
        useGetInterventionCategories();
    const { data: costLines, isLoading: isLoadingLines } =
        useGetCostBreakdownLines();

    const groups = useMemo(
        () =>
            buildCostItemGroups(interventionCategories ?? [], costLines ?? []),
        [interventionCategories, costLines],
    );

    return {
        groups,
        interventionCategories: interventionCategories ?? NO_CATEGORIES,
        isLoading: isLoadingCategories || isLoadingLines,
    };
};
