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
    impactMetricsByScenarioId: Map<number, ScenarioImpactMetrics | undefined>,
): PrevalenceDataPoint[] => {
    const yearSet = new Set<number>();
    scenarios.forEach(scenario => {
        const impact = impactMetricsByScenarioId.get(scenario.id);
        impact?.by_year?.forEach(yr => yearSet.add(yr.year));
    });

    const years = Array.from(yearSet).sort((a, b) => a - b);
    if (years.length === 0) return [];

    return years.map(year => {
        const point: PrevalenceDataPoint = { year };
        scenarios.forEach(scenario => {
            const impact = impactMetricsByScenarioId.get(scenario.id);
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

/** cost_per_averted = cost_diff / (baseline_cases − scenario_cases) */
const costPerAverted = (
    costDiff: number,
    baselineCases: number,
    scenarioCases: number,
): { costPerAvertedCase: number; avertedCases: number } | undefined => {
    const avertedCases = baselineCases - scenarioCases;
    // Cases are absolute counts; < 1 means nothing meaningful was averted.
    if (avertedCases < 1) return undefined;
    const costPerAvertedCase = costDiff / avertedCases;
    return { costPerAvertedCase, avertedCases };
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
 *   averted_cases    = baseline.cases − scenario.cases
 *   cost_per_averted = (scenario.cost − baseline.cost) / averted_cases
 *
 * Only uncomplicated cases are used (severe cases excluded).
 * A scenario must avert at least 1 case to be included; otherwise the
 * metric is meaningless and `hasInsufficientAverted` is flagged.
 * Confidence intervals repeat the formula with pessimistic/optimistic bounds.
 */
export const buildCostPerAvertedCaseChartData = (
    scenarios: ScenarioDisplay[],
    impactMetricsByScenarioId: Map<number, ScenarioImpactMetrics | undefined>,
    budgetsByScenarioId: Map<number, BudgetCalculationResponse | undefined>,
    baselineScenarioId: number | undefined,
): CostPerAvertedCaseResult => {
    const empty: CostPerAvertedCaseResult = {
        data: [],
        hasInsufficientAverted: false,
    };
    if (baselineScenarioId === undefined) return empty;

    const baselineCases = impactMetricsByScenarioId.get(baselineScenarioId)?.number_cases;
    const baselineCost = getCumulativeCosts(budgetsByScenarioId.get(baselineScenarioId));
    if (baselineCases?.value == null || baselineCost == null) return empty;

    let hasInsufficientAverted = false;

    const data = scenarios
        .filter((scenario) => scenario.id !== baselineScenarioId)
        .map((scenario): CostPerAvertedCaseDatum | null => {

            const scenarioCases = impactMetricsByScenarioId.get(scenario.id)?.number_cases;
            const scenarioCost = getCumulativeCosts(budgetsByScenarioId.get(scenario.id));
            if (scenarioCost == null || scenarioCases?.value == null) return null;

            const costDiff = scenarioCost - baselineCost;

            const central = costPerAverted(costDiff, baselineCases.value!, scenarioCases.value);
            if (central === undefined) {
                hasInsufficientAverted = true;
                return null;
            }

            // CI bounds: cross baseline.lower with scenario.upper (and vice-versa)
            // to get the pessimistic/optimistic averted-cases denominators.
            const lower = costPerAverted(costDiff, baselineCases.lower ?? 0, scenarioCases.upper ?? 0);
            const upper = costPerAverted(costDiff, baselineCases.upper ?? 0, scenarioCases.lower ?? 0);

            // Stored as offsets from the central value (Recharts ErrorBar expects deltas).
            let errorLower = 0;
            let errorUpper = 0;
            if (lower !== undefined && upper !== undefined) {
                errorLower = central.costPerAvertedCase - Math.min(lower.costPerAvertedCase, upper.costPerAvertedCase);
                errorUpper = Math.max(lower.costPerAvertedCase, upper.costPerAvertedCase) - central.costPerAvertedCase;
            }

            return {
                name: scenario.label,
                value: central.costPerAvertedCase,
                relativeCost: costDiff,
                avertedCases: central.avertedCases,
                errorLower,
                errorUpper,
                errorBounds: [errorLower, errorUpper],
                color: scenario.color,
            };
        })
        .filter((d): d is CostPerAvertedCaseDatum => d !== null);

    return { data, hasInsufficientAverted };
};
