import { BudgetCalculationResponse } from '../../planning/types/budget';
import { ScenarioImpactMetrics, ScenarioDisplay } from '../types';
import { getCumulativeCosts } from './impactCalculations';

// --- Yearly prevalence chart ---

export type PrevalenceDataPoint = {
    year: number;
    [key: string]: number | [number, number] | undefined;
};

/**
 * Builds a flat array of data points for a Recharts line chart.
 * Each point contains the year plus one key per scenario (the prevalence value)
 * and an optional `_ci` key with the confidence interval error bars.
 */
export const buildPrevalenceChartData = (
    scenarios: ScenarioDisplay[],
    impactsByScenarioId: Map<number, ScenarioImpactMetrics | undefined>,
): PrevalenceDataPoint[] => {
    const yearSet = new Set<number>();
    scenarios.forEach(scenario => {
        const impact = impactsByScenarioId.get(scenario.id);
        impact?.by_year?.forEach(yr => yearSet.add(yr.year));
    });

    const years = Array.from(yearSet).sort((a, b) => a - b);
    if (years.length === 0) return [];

    return years.map(year => {
        const point: PrevalenceDataPoint = { year };
        scenarios.forEach(scenario => {
            const impact = impactsByScenarioId.get(scenario.id);
            const yearData = impact?.by_year?.find(yr => yr.year === year);
            const metric = yearData?.prevalence_rate;
            point[scenario.label] = metric?.value ?? undefined;

            if (
                metric?.value != null &&
                metric?.lower != null &&
                metric?.upper != null
            ) {
                point[`${scenario.label}_ci`] = [
                    metric.value - metric.lower,
                    metric.upper - metric.value,
                ];
            }
        });
        return point;
    });
};

// --- Cost per averted case chart ---

export type CostPerAvertedCaseDatum = {
    name: string;
    value: number;
    relativeCost: number;
    avertedCases: number;
    errorLower: number;
    errorUpper: number;
    errorBounds: [number, number];
    color: string;
};

const computeCostPerAverted = (
    costDiff: number,
    baselineCases: number | null | undefined,
    scenarioCases: number | null | undefined,
): { value: number; averted: number } | undefined => {
    if (baselineCases == null || scenarioCases == null) return undefined;
    const averted = baselineCases - scenarioCases;
    // Cases are absolute counts, so < 1 means no meaningful case was averted.
    // This also prevents near-zero divisions producing huge values.
    if (averted < 1) return undefined;
    return { value: costDiff / averted, averted };
};

export type CostPerAvertedCaseResult = {
    data: CostPerAvertedCaseDatum[];
    /** True when at least one scenario was excluded because it does not
     *  meaningfully avert cases compared to the baseline. */
    hasInsufficientAverted: boolean;
};

/**
 * Computes comparative cost-per-averted-case for each non-baseline scenario.
 *
 * averted_cases       = baseline.cases - scenario.cases
 * cost_per_averted    = (scenario.cost - baseline.cost) / averted_cases
 *
 * Only scenarios that meaningfully avert cases (≥ 1) are included.
 *
 * Only uncomplicated cases (excluding severe) are used for averted cases.
 * Confidence intervals use the worst/best case averted bounds
 * (baseline.lower − scenario.upper and baseline.upper − scenario.lower).
 * The baseline itself is never shown (it has no comparison target).
 */
export const buildCostPerAvertedCaseChartData = (
    scenarios: ScenarioDisplay[],
    impactsByScenarioId: Map<number, ScenarioImpactMetrics | undefined>,
    budgetsByScenarioId: Map<number, BudgetCalculationResponse | undefined>,
    baselineScenarioId: number | undefined,
): CostPerAvertedCaseResult => {
    const empty: CostPerAvertedCaseResult = {
        data: [],
        hasInsufficientAverted: false,
    };
    if (baselineScenarioId === undefined) return empty;

    const baselineImpact = impactsByScenarioId.get(baselineScenarioId);
    const b = baselineImpact?.number_cases;
    const baselineCost = getCumulativeCosts(
        budgetsByScenarioId.get(baselineScenarioId),
    );

    if (b?.value == null || baselineCost == null) return empty;

    let hasInsufficientAverted = false;

    const data = scenarios
        .filter(s => s.id !== baselineScenarioId)
        .map((scenario): CostPerAvertedCaseDatum | null => {
            const impact = impactsByScenarioId.get(scenario.id);
            const s = impact?.number_cases;
            const cost = getCumulativeCosts(
                budgetsByScenarioId.get(scenario.id),
            );
            if (cost == null) return null;

            const costDiff = cost - baselineCost;
            const central = computeCostPerAverted(costDiff, b.value, s?.value);
            if (central === undefined) {
                if (s?.value != null) {
                    hasInsufficientAverted = true;
                }
                return null;
            }

            const bound1 = computeCostPerAverted(costDiff, b.lower, s?.upper);
            const bound2 = computeCostPerAverted(costDiff, b.upper, s?.lower);

            let errorLower = 0;
            let errorUpper = 0;
            if (bound1 !== undefined && bound2 !== undefined) {
                const ciLower = Math.min(bound1.value, bound2.value);
                const ciUpper = Math.max(bound1.value, bound2.value);
                errorLower = central.value - ciLower;
                errorUpper = ciUpper - central.value;
            }

            return {
                name: scenario.label,
                value: central.value,
                relativeCost: costDiff,
                avertedCases: central.averted,
                errorLower,
                errorUpper,
                errorBounds: [errorLower, errorUpper],
                color: scenario.color,
            };
        })
        .filter((d): d is CostPerAvertedCaseDatum => d !== null);

    return { data, hasInsufficientAverted };
};
