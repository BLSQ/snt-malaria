import { useMemo } from 'react';
import { useGetLatestCalculatedBudget } from '../../planning/hooks/useGetLatestCalculatedBudget';
import { BudgetCalculationResponse } from '../../planning/types/budget';
import { useGetScenarioImpact } from './useGetScenarioImpact';
import { ScenarioImpactMetrics, ScenarioId, toNumericId } from '../types';

type Params = {
    baselineScenarioId: ScenarioId;
    comparisonScenarioIds: ScenarioId[];
    yearFrom: number | undefined;
    yearTo: number | undefined;
    selectedAgeGroup: string | undefined;
};

/**
 * Fetches budget and impact data for the baseline and up to two comparison
 * scenarios. Returns the resolved data indexed by numeric scenario id,
 * plus loading flags for each data category.
 *
 * Impact queries are disabled until `yearFrom` is defined, which signals
 * that the effective year range has been computed upstream.
 */
export const useComparisonData = ({
    baselineScenarioId,
    comparisonScenarioIds,
    yearFrom,
    yearTo,
    selectedAgeGroup,
}: Params) => {
    const baselineNumericId = toNumericId(baselineScenarioId);
    const comparisonId1 = toNumericId(comparisonScenarioIds[0]);
    const comparisonId2 = toNumericId(comparisonScenarioIds[1]);

    const impactEnabled = yearFrom !== undefined;

    const baselineBudgetQuery = useGetLatestCalculatedBudget(baselineNumericId);
    const comparisonBudget1Query = useGetLatestCalculatedBudget(comparisonId1);
    const comparisonBudget2Query = useGetLatestCalculatedBudget(comparisonId2);

    const baselineImpactQuery = useGetScenarioImpact(
        baselineNumericId,
        yearFrom,
        yearTo,
        selectedAgeGroup,
        impactEnabled,
    );
    const comparisonImpact1Query = useGetScenarioImpact(
        comparisonId1,
        yearFrom,
        yearTo,
        selectedAgeGroup,
        impactEnabled,
    );
    const comparisonImpact2Query = useGetScenarioImpact(
        comparisonId2,
        yearFrom,
        yearTo,
        selectedAgeGroup,
        impactEnabled,
    );

    const resolveData = <T,>(query: {
        isFetching: boolean;
        isError: boolean;
        data: T | undefined;
    }): T | undefined =>
        query.isFetching || query.isError ? undefined : query.data;

    const baselineBudget = resolveData(baselineBudgetQuery);
    const comparisonBudget1 = resolveData(comparisonBudget1Query);
    const comparisonBudget2 = resolveData(comparisonBudget2Query);
    const baselineImpact = resolveData(baselineImpactQuery);
    const comparisonImpact1 = resolveData(comparisonImpact1Query);
    const comparisonImpact2 = resolveData(comparisonImpact2Query);

    const isBudgetLoading =
        baselineBudgetQuery.isFetching ||
        comparisonBudget1Query.isFetching ||
        comparisonBudget2Query.isFetching;

    const isImpactLoading =
        baselineImpactQuery.isFetching ||
        comparisonImpact1Query.isFetching ||
        comparisonImpact2Query.isFetching;

    const budgetsByScenarioId = useMemo(() => {
        const map = new Map<number, BudgetCalculationResponse | undefined>();
        if (baselineNumericId) map.set(baselineNumericId, baselineBudget);
        if (comparisonId1) map.set(comparisonId1, comparisonBudget1);
        if (comparisonId2) map.set(comparisonId2, comparisonBudget2);
        return map;
    }, [
        baselineNumericId,
        comparisonId1,
        comparisonId2,
        baselineBudget,
        comparisonBudget1,
        comparisonBudget2,
    ]);

    const impactsByScenarioId = useMemo(() => {
        const map = new Map<number, ScenarioImpactMetrics | undefined>();
        if (yearFrom === undefined) return map;
        if (baselineNumericId) map.set(baselineNumericId, baselineImpact);
        if (comparisonId1) map.set(comparisonId1, comparisonImpact1);
        if (comparisonId2) map.set(comparisonId2, comparisonImpact2);
        return map;
    }, [
        yearFrom,
        baselineNumericId,
        comparisonId1,
        comparisonId2,
        baselineImpact,
        comparisonImpact1,
        comparisonImpact2,
    ]);

    return {
        baselineScenarioNumericId: baselineNumericId,
        budgetsByScenarioId,
        impactsByScenarioId,
        isBudgetLoading,
        isImpactLoading,
    };
};
