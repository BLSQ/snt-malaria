import { Budget, BudgetCalculationResponse } from '../../planning/types/budget';
import {
    ImpactMetricWithConfidenceInterval,
    MetricKey,
    ScenarioDisplay,
    ScenarioImpactMetrics,
    YearImpactMetrics,
} from '../types';
import {
    buildYearlyMetricChartData,
    getYearlyMetricMaxValue,
} from './chartData';

const scenarios: ScenarioDisplay[] = [
    { id: 1, label: 'Baseline', color: '#000' },
    { id: 2, label: 'Plan B', color: '#fff' },
];

const metric = (
    value: number | null,
    lower: number | null = null,
    upper: number | null = null,
): ImpactMetricWithConfidenceInterval => ({ value, lower, upper });

const makeYear = (
    year: number,
    overrides: Partial<YearImpactMetrics> = {},
): YearImpactMetrics => ({
    year,
    direct_deaths: metric(null),
    number_cases: metric(null),
    number_severe_cases: metric(null),
    prevalence_rate: metric(null),
    org_units: [],
    ...overrides,
});

const makeImpact = (byYear: YearImpactMetrics[]): ScenarioImpactMetrics =>
    ({ by_year: byYear }) as ScenarioImpactMetrics;

const makeBudgetYear = (year: number, costs: number[]): Budget => ({
    year,
    total_cost: 0,
    org_units_costs: [],
    interventions: costs.map((total_cost, i) => ({
        id: i,
        type: 'type',
        code: 'code',
        total_cost,
        cost_breakdown: [],
    })),
});

const makeBudget = (results: Budget[]): BudgetCalculationResponse => ({
    scenario: 1,
    results,
    fixed_costs_prorated: false,
});

describe('buildYearlyMetricChartData', () => {
    it('reads the selected impact metric per year with confidence interval deltas', () => {
        const impacts = new Map([
            [
                1,
                makeImpact([
                    makeYear(2026, { number_cases: metric(100, 80, 130) }),
                    makeYear(2025, { number_cases: metric(120, 100, 140) }),
                ]),
            ],
            [2, makeImpact([makeYear(2025, { number_cases: metric(90) })])],
        ]);

        const data = buildYearlyMetricChartData(
            scenarios,
            MetricKey.Cases,
            impacts,
        );

        expect(data).toEqual([
            {
                year: 2025,
                Baseline: 120,
                Baseline_ci: [20, 20],
                'Plan B': 90,
            },
            {
                year: 2026,
                Baseline: 100,
                Baseline_ci: [20, 30],
                'Plan B': undefined,
            },
        ]);
    });

    it('sums intervention costs per budget year without confidence intervals', () => {
        const budgets = new Map([
            [1, makeBudget([makeBudgetYear(2025, [10, 5])])],
            [
                2,
                makeBudget([
                    makeBudgetYear(2025, [20]),
                    makeBudgetYear(2026, [30, 1]),
                ]),
            ],
        ]);

        const data = buildYearlyMetricChartData(
            scenarios,
            MetricKey.OrgUnitTotalCost,
            new Map(),
            budgets,
        );

        expect(data).toEqual([
            { year: 2025, Baseline: 15, 'Plan B': 20 },
            { year: 2026, Baseline: undefined, 'Plan B': 31 },
        ]);
    });

    it('returns no points when no scenario has data', () => {
        expect(
            buildYearlyMetricChartData(
                scenarios,
                MetricKey.PrevalenceRate,
                new Map([[1, undefined]]),
            ),
        ).toEqual([]);
    });
});

describe('getYearlyMetricMaxValue', () => {
    it('includes the upper confidence bound', () => {
        const data = [
            {
                year: 2025,
                Baseline: 0.3,
                Baseline_ci: [0.1, 0.2] as [number, number],
            },
            { year: 2026, Baseline: 0.4, 'Plan B': 0.45 },
        ];

        expect(getYearlyMetricMaxValue(data, ['Baseline', 'Plan B'])).toBe(0.5);
    });
});
