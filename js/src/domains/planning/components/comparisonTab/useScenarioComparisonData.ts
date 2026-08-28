import { useMemo } from 'react';
import { useGetLatestCalculatedBudget } from '../../hooks/useGetLatestCalculatedBudget';
import { Budget } from '../../types/budget';
import { YearlyCost } from '../../types/comparisonAggregation';
import { ComparisonSlot } from './types';
import { MAX_SLOTS } from './useComparisonSlots';

if (MAX_SLOTS !== 3) {
    throw new Error(
        'MAX_SLOTS changed: update the 3 fixed useGetLatestCalculatedBudget calls below to match.',
    );
}

/**
 * Fetches each slot's calculated budget (already computed for every year of
 * its scenario). Exposes the single year the slot has selected
 * (`budgetsBySlotKey`) plus a lean per-slot total-cost-by-year series
 * (`totalCostsBySlotKey`, for the cost-over-time chart) -- the full `Budget`
 * objects for the other years never leave this hook. Always calls exactly
 * `MAX_SLOTS` (currently 3) `useGetLatestCalculatedBudget` hooks (React's
 * rules of hooks forbid a variable count); slots beyond what's currently
 * selected pass `undefined`, which the hook treats as disabled.
 */
export const useScenarioComparisonData = (slots: ComparisonSlot[]) => {
    const budgetQuery0 = useGetLatestCalculatedBudget(slots[0]?.scenarioId);
    const budgetQuery1 = useGetLatestCalculatedBudget(slots[1]?.scenarioId);
    const budgetQuery2 = useGetLatestCalculatedBudget(slots[2]?.scenarioId);

    // Depend on `data.results` -- referentially stable across renders thanks
    // to react-query's structural sharing plus `staleTime: Infinity` -- not
    // the query objects, which are a fresh reference on every render and
    // would defeat the memos below.
    const results0 = budgetQuery0?.data?.results;
    const results1 = budgetQuery1?.data?.results;
    const results2 = budgetQuery2?.data?.results;

    const budgetsBySlotKey = useMemo(() => {
        const resultsByIndex = [results0, results1, results2];
        const map = new Map<string, Budget | undefined>();
        slots.forEach((slot, index) => {
            map.set(
                slot.key,
                resultsByIndex[index]?.find(
                    result => result.year === slot.year,
                ),
            );
        });
        return map;
    }, [slots, results0, results1, results2]);

    const totalCostsBySlotKey = useMemo(() => {
        const resultsByIndex = [results0, results1, results2];
        const map = new Map<string, YearlyCost[]>();
        slots.forEach((slot, index) => {
            map.set(
                slot.key,
                (resultsByIndex[index] ?? []).map(budget => ({
                    year: budget.year,
                    totalCost: budget.total_cost,
                })),
            );
        });
        return map;
    }, [slots, results0, results1, results2]);

    const isBudgetLoading =
        Boolean(budgetQuery0?.isFetching) ||
        Boolean(budgetQuery1?.isFetching) ||
        Boolean(budgetQuery2?.isFetching);

    return { budgetsBySlotKey, totalCostsBySlotKey, isBudgetLoading };
};
