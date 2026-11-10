import { BudgetCalculationResponse } from '../../planning/types/budget';
import {
    ImpactMetricKey,
    ImpactMetricWithConfidenceInterval,
    MetricKey,
    ScenarioImpactMetrics,
    ScenarioDisplay,
} from '../types';
import { getCumulativeCosts, getYearCost } from './impactCalculations';

// --- Yearly metric chart ---

export type YearlyMetricDataPoint = {
    year: number;
    [key: string]: number | [number, number] | undefined;
};

type YearlyMetricValues = Map<number, ImpactMetricWithConfidenceInterval>;

const getYearlyCosts = (
    budget: BudgetCalculationResponse | undefined,
): YearlyMetricValues =>
    new Map(
        (budget?.results ?? []).map(result => [
            result.year,
            {
                value: getYearCost(result),
                lower: null,
                upper: null,
            },
        ]),
    );

const getYearlyImpactValues = (
    impact: ScenarioImpactMetrics | undefined,
    metric: ImpactMetricKey,
): YearlyMetricValues =>
    new Map((impact?.by_year ?? []).map(yr => [yr.year, yr[metric]]));

/**
 * Builds a flat array of data points for a Recharts line chart.
 * Each point contains the year plus one key per scenario (the metric value)
 * and an optional `_ci` key with the confidence interval error bars.
 */
export const buildYearlyMetricChartData = (
    scenarios: ScenarioDisplay[],
    metric: MetricKey,
    impactMetricsByScenarioId: Map<number, ScenarioImpactMetrics | undefined>,
    budgetsByScenarioId?: Map<number, BudgetCalculationResponse | undefined>,
): YearlyMetricDataPoint[] => {
    const valuesByScenarioId = new Map<number, YearlyMetricValues>(
        scenarios.map(scenario => [
            scenario.id,
            metric === MetricKey.OrgUnitTotalCost
                ? getYearlyCosts(budgetsByScenarioId?.get(scenario.id))
                : getYearlyImpactValues(
                      impactMetricsByScenarioId.get(scenario.id),
                      metric,
                  ),
        ]),
    );

    const yearSet = new Set<number>();
    valuesByScenarioId.forEach(values =>
        values.forEach((_, year) => yearSet.add(year)),
    );
    const years = Array.from(yearSet).sort((a, b) => a - b);

    return years.map(year => {
        const point: YearlyMetricDataPoint = { year };
        scenarios.forEach(scenario => {
            const value = valuesByScenarioId.get(scenario.id)?.get(year);
            point[scenario.label] = value?.value ?? undefined;

            if (
                value?.value != null &&
                value?.lower != null &&
                value?.upper != null
            ) {
                point[`${scenario.label}_ci`] = [
                    value.value - value.lower,
                    value.upper - value.value,
                ];
            }
        });
        return point;
    });
};

/**
 * Largest value (including the upper confidence bound) across the given
 * series. Used to size the value axis to its widest formatted tick.
 */
export const getYearlyMetricMaxValue = (
    data: YearlyMetricDataPoint[],
    seriesKeys: string[],
): number => {
    let max = 0;
    data.forEach(point => {
        seriesKeys.forEach(key => {
            const value = point[key];
            if (typeof value !== 'number') return;
            const ci = point[`${key}_ci`];
            const upper = Array.isArray(ci) ? value + (ci[1] ?? 0) : value;
            max = Math.max(max, value, upper);
        });
    });
    return max;
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

    const baselineCases =
        impactMetricsByScenarioId.get(baselineScenarioId)?.number_cases;
    const baselineCost = getCumulativeCosts(
        budgetsByScenarioId.get(baselineScenarioId),
    );
    if (baselineCases?.value == null || baselineCost == null) return empty;

    let hasInsufficientAverted = false;

    const data = scenarios
        .filter(scenario => scenario.id !== baselineScenarioId)
        .map((scenario): CostPerAvertedCaseDatum | null => {
            const scenarioCases = impactMetricsByScenarioId.get(
                scenario.id,
            )?.number_cases;
            const scenarioCost = getCumulativeCosts(
                budgetsByScenarioId.get(scenario.id),
            );
            if (scenarioCost == null || scenarioCases?.value == null)
                return null;

            const costDiff = scenarioCost - baselineCost;

            const central = costPerAverted(
                costDiff,
                baselineCases.value!,
                scenarioCases.value,
            );
            if (central === undefined) {
                hasInsufficientAverted = true;
                return null;
            }

            // CI bounds: cross baseline.lower with scenario.upper (and vice-versa)
            // to get the pessimistic/optimistic averted-cases denominators.
            const lower = costPerAverted(
                costDiff,
                baselineCases.lower ?? 0,
                scenarioCases.upper ?? 0,
            );
            const upper = costPerAverted(
                costDiff,
                baselineCases.upper ?? 0,
                scenarioCases.lower ?? 0,
            );

            // Stored as offsets from the central value (Recharts ErrorBar expects deltas).
            let errorLower = 0;
            let errorUpper = 0;
            if (lower !== undefined && upper !== undefined) {
                errorLower =
                    central.costPerAvertedCase -
                    Math.min(
                        lower.costPerAvertedCase,
                        upper.costPerAvertedCase,
                    );
                errorUpper =
                    Math.max(
                        lower.costPerAvertedCase,
                        upper.costPerAvertedCase,
                    ) - central.costPerAvertedCase;
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
