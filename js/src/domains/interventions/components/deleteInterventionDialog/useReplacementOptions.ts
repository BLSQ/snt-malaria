import { useMemo } from 'react';
import { useGetInterventionCategories } from '../../hooks/useGetInterventionCategories';
import { Intervention } from '../../types';
import { CategorySelectOption } from './useCategoryHeaderRenderOption';

export const useReplacementOptions = (
    intervention: Intervention,
): CategorySelectOption[] => {
    const { data: categories = [] } = useGetInterventionCategories();
    return useMemo(() => {
        const sameCategoryFirst = [...categories].sort(
            (a, b) =>
                Number(b.id === intervention.intervention_category) -
                Number(a.id === intervention.intervention_category),
        );
        return sameCategoryFirst.flatMap(category =>
            category.interventions
                .filter(({ id }) => id !== intervention.id)
                .map(option => ({
                    value: option.id,
                    label: option.name,
                    groupKey: String(category.id),
                    groupLabel: category.name,
                })),
        );
    }, [categories, intervention]);
};
