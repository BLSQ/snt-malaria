import { useMemo } from 'react';
import { useGetLatestCalculatedBudget } from '../../hooks/useGetLatestCalculatedBudget';
import { Budget } from '../../types/budget';
import { ComparisonSlot } from './types';

/**
 * Fetches each slot's calculated budget (already computed for every year of
 * its scenario) and narrows it down to the single year the slot has
 * selected. Always calls exactly 3 `useGetLatestCalculatedBudget` hooks
 * (React's rules of hooks forbid a variable count); slots beyond what's
 * currently selected pass `undefined`, which the hook treats as disabled.
 */
export const useScenarioComparisonData = (slots: ComparisonSlot[]) => {
    const slot0 = slots[0];
    const slot1 = slots[1];
    const slot2 = slots[2];

    const budgetQuery0 = useGetLatestCalculatedBudget(slot0?.scenarioId);
    const budgetQuery1 = useGetLatestCalculatedBudget(slot1?.scenarioId);
    const budgetQuery2 = useGetLatestCalculatedBudget(slot2?.scenarioId);

    const queriesByIndex = [budgetQuery0, budgetQuery1, budgetQuery2];

    const budgetsBySlotKey = useMemo(() => {
        const map = new Map<string, Budget | undefined>();
        slots.forEach((slot, index) => {
            const results = queriesByIndex[index]?.data?.results;
            map.set(slot.key, results?.find(result => result.year === slot.year));
        });
        return map;
    }, [slots, budgetQuery0.data, budgetQuery1.data, budgetQuery2.data]);

    const isBudgetLoading = slots.some(
        (_, index) => queriesByIndex[index]?.isFetching,
    );

    return { budgetsBySlotKey, isBudgetLoading };
};
