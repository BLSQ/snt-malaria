import { BudgetCalculationResponse } from '../../planning/types/budget';
import { ScenarioImpactMetrics } from '../types';

/**
 * Sums the total cost of all interventions across all years in a budget.
 * Returns `undefined` when no budget data is available.
 */
export const getCumulativeCosts = (
    budget?: BudgetCalculationResponse,
): number | undefined => {
    if (!budget?.results?.length) return undefined;
    return budget.results.reduce((yearSum, result) => {
        const yearTotal =
            result.interventions?.reduce(
                (sum, intervention) => sum + (intervention.total_cost ?? 0),
                0,
            ) ?? 0;
        return yearSum + yearTotal;
    }, 0);
};

/**
 * Computes the relative PfPR reduction between the first and last year
 * in the impact response: `(start - end) / start`.
 * Returns `undefined` when fewer than two years of data are available
 * or the starting prevalence is zero.
 */
export const getPfprReduction = (
    impact?: ScenarioImpactMetrics,
): number | undefined => {
    const byYear = impact?.by_year;
    if (!byYear || byYear.length < 2) return undefined;
    const years = [...new Set(byYear.map(yr => yr.year))].sort(
        (a, b) => a - b,
    );
    const minYear = years[0];
    const maxYear = years[years.length - 1];
    if (minYear === maxYear) return undefined;
    const startData = byYear.find(yr => yr.year === minYear);
    const endData = byYear.find(yr => yr.year === maxYear);
    const start = startData?.prevalence_rate?.value;
    const end = endData?.prevalence_rate?.value;
    if (start == null || end == null || start <= 0) return undefined;
    return (start - end) / start;
};

/** Formats a number as a locale-aware percentage with up to 2 decimal places. */
export const formatPercent = (value: number) =>
    new Intl.NumberFormat(undefined, {
        style: 'percent',
        maximumFractionDigits: 2,
    }).format(value);

/** Converts `null` to `undefined`, leaving other values unchanged. */
export const nullToUndefined = (
    value: number | null | undefined,
): number | undefined => (value === null ? undefined : value);
