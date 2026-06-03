import { BudgetCalculationResponse } from '../../planning/types/budget';
import { ScenarioImpactMetrics } from '../types';

/**
 * Returns each org unit's cumulative `total_cost` summed across every year in `budget.results`.
 * Org units missing from a given year are skipped for that year only.
 */
export const getOrgUnitCumulativeCostsMap = (
    budget?: BudgetCalculationResponse,
): Map<number, number> => {
    const map = new Map<number, number>();
    if (!budget?.results?.length) return map;
    for (const yearResult of budget.results) {
        for (const ou of yearResult.org_units_costs ?? []) {
            const id = ou.org_unit_id;
            map.set(id, (map.get(id) ?? 0) + (ou.total_cost ?? 0));
        }
    }
    return map;
};

/**
 * Per-org-unit budget cost deltas: `comparison − baseline`, where each side's total is the sum of
 * that org unit's `total_cost` over every year row in `budget.results`.
 */
export const computeOrgUnitCumulativeCostDeltas = (
    baselineBudget?: BudgetCalculationResponse,
    comparisonBudget?: BudgetCalculationResponse,
): Map<number, number> => {
    const baselineByOu = getOrgUnitCumulativeCostsMap(baselineBudget);
    const comparisonByOu = getOrgUnitCumulativeCostsMap(comparisonBudget);
    const deltas = new Map<number, number>();
    for (const [orgUnitId, comparisonCost] of comparisonByOu) {
        const baselineCost = baselineByOu.get(orgUnitId);
        if (baselineCost !== undefined) {
            deltas.set(orgUnitId, comparisonCost - baselineCost);
        }
    }
    return deltas;
};

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
 * Relative PfPR evolution between the first and last year in the impact
 * response: `(end - start) / start`. Negative when prevalence decreases,
 * positive when it increases. Returns `undefined` when fewer than two years
 * of data are available or the starting prevalence is zero.
 */
export const getPfprEvolution = (
    impact?: ScenarioImpactMetrics,
): number | undefined => {
    const byYear = impact?.by_year;
    if (!byYear || byYear.length < 2) return undefined;
    const years = [...new Set(byYear.map(yr => yr.year))].sort((a, b) => a - b);
    const minYear = years[0];
    const maxYear = years[years.length - 1];
    if (minYear === maxYear) return undefined;
    const startData = byYear.find(yr => yr.year === minYear);
    const endData = byYear.find(yr => yr.year === maxYear);
    const start = startData?.prevalence_rate?.value;
    const end = endData?.prevalence_rate?.value;
    if (start == null || end == null || start <= 0) return undefined;
    return (end - start) / start;
};
