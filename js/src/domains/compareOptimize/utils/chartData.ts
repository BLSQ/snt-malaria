import { ScenarioImpactMetrics, ScenarioDisplay } from '../types';

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
    error?: [number, number];
    color: string;
};

/**
 * Extracts cost-per-averted-case bar chart data from impact results.
 * Scenarios with no data, zero, or negative cost are excluded.
 */
export const buildCostChartData = (
    scenarios: ScenarioDisplay[],
    impactsByScenarioId: Map<number, ScenarioImpactMetrics | undefined>,
): CostPerAvertedCaseDatum[] =>
    scenarios
        .map((scenario): CostPerAvertedCaseDatum | null => {
            const impact = impactsByScenarioId.get(scenario.id);
            const metric = impact?.cost_per_averted_case;
            const costValue = metric?.value;

            if (!costValue || costValue < 0) {
                return null;
            }

            const datum: CostPerAvertedCaseDatum = {
                name: scenario.label,
                value: costValue,
                color: scenario.color,
            };

            if (metric.lower != null && metric.upper != null) {
                datum.error = [
                    costValue - metric.lower,
                    metric.upper - costValue,
                ];
            }

            return datum;
        })
        .filter((d): d is CostPerAvertedCaseDatum => d !== null);
