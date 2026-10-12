import { Scenario } from '../../scenarios/types';
import {
    RuleCostLineOverride,
    RuleInterventionOverride,
} from '../types/scenarioRule';

export type CostLineValueField =
    | 'unit_cost'
    | 'conversion_factor'
    | 'buffer'
    | 'coverage';

const COST_LINE_VALUE_FIELDS: CostLineValueField[] = [
    'unit_cost',
    'conversion_factor',
    'buffer',
    'coverage',
];

export const getScenarioYears = (scenario?: Scenario): number[] => {
    if (!scenario) return [];
    const years: number[] = [];
    for (let year = scenario.start_year; year <= scenario.end_year; year += 1) {
        years.push(year);
    }
    return years;
};

export const emptyInterventionOverride = (
    interventionId: number,
): RuleInterventionOverride => ({
    intervention: interventionId,
    deployment_years: null,
    grant: null,
    cost_lines: [],
});

export const emptyCostLineOverride = (
    costLineId: number,
): RuleCostLineOverride => ({
    cost_line: costLineId,
    unit_cost: null,
    conversion_factor: null,
    buffer: null,
    coverage: null,
    yearly_coverage: {},
});

export const findInterventionOverride = (
    overrides: RuleInterventionOverride[],
    interventionId: number,
): RuleInterventionOverride | undefined =>
    overrides.find(override => override.intervention === interventionId);

export const findCostLineOverride = (
    override: RuleInterventionOverride | undefined,
    costLineId: number,
): RuleCostLineOverride | undefined =>
    override?.cost_lines.find(line => line.cost_line === costLineId);

export const getDeployedYears = (
    override: RuleInterventionOverride | undefined,
    scenarioYears: number[],
): number[] =>
    override?.deployment_years
        ? scenarioYears.filter(year =>
              override.deployment_years?.includes(year),
          )
        : scenarioYears;

export const getYearCoverage = (
    costLineOverride: RuleCostLineOverride | undefined,
    year: number,
): number | undefined => costLineOverride?.yearly_coverage[String(year)];

export const hasYearValue = (
    override: RuleInterventionOverride | undefined,
    year: number,
): boolean =>
    Boolean(
        override?.cost_lines.some(
            line => getYearCoverage(line, year) !== undefined,
        ),
    );

export const countCostLineOverrides = (
    costLineOverride: RuleCostLineOverride | undefined,
): number =>
    costLineOverride
        ? COST_LINE_VALUE_FIELDS.filter(
              field => costLineOverride[field] !== null,
          ).length + Object.keys(costLineOverride.yearly_coverage).length
        : 0;

/** Grant and cost item values; deployment years are a setting, not counted as overrides. */
export const countInterventionOverrides = (
    override: RuleInterventionOverride | undefined,
): number =>
    override
        ? (override.grant !== null ? 1 : 0) +
          override.cost_lines.reduce(
              (total, line) => total + countCostLineOverrides(line),
              0,
          )
        : 0;

const isEmptyCostLineOverride = (costLineOverride: RuleCostLineOverride) =>
    countCostLineOverrides(costLineOverride) === 0;

const isEmptyInterventionOverride = (override: RuleInterventionOverride) =>
    override.deployment_years === null &&
    override.grant === null &&
    override.cost_lines.length === 0;

export const replaceInterventionOverride = (
    overrides: RuleInterventionOverride[],
    next: RuleInterventionOverride,
): RuleInterventionOverride[] => {
    const cleaned = {
        ...next,
        cost_lines: next.cost_lines.filter(
            line => !isEmptyCostLineOverride(line),
        ),
    };
    const others = overrides.filter(
        override => override.intervention !== next.intervention,
    );
    return isEmptyInterventionOverride(cleaned) ? others : [...others, cleaned];
};

export const replaceCostLineOverride = (
    override: RuleInterventionOverride,
    next: RuleCostLineOverride,
): RuleInterventionOverride => ({
    ...override,
    cost_lines: [
        ...override.cost_lines.filter(
            line => line.cost_line !== next.cost_line,
        ),
        next,
    ],
});

export const setYearCoverage = (
    costLineOverride: RuleCostLineOverride,
    year: number,
    coverage: number | null,
): RuleCostLineOverride => {
    const yearlyCoverage = { ...costLineOverride.yearly_coverage };
    if (coverage === null) {
        delete yearlyCoverage[String(year)];
    } else {
        yearlyCoverage[String(year)] = coverage;
    }
    return { ...costLineOverride, yearly_coverage: yearlyCoverage };
};

/** Toggled years drop their per-year cost item values, which were set against the old deployment. */
export const setDeploymentYears = (
    override: RuleInterventionOverride,
    years: number[],
    scenarioYears: number[],
): RuleInterventionOverride => {
    const previous = getDeployedYears(override, scenarioYears);
    const toggled = scenarioYears.filter(
        year => previous.includes(year) !== years.includes(year),
    );
    const isEveryYear = scenarioYears.every(year => years.includes(year));
    return {
        ...override,
        deployment_years: isEveryYear
            ? null
            : scenarioYears.filter(year => years.includes(year)),
        cost_lines: override.cost_lines.map(line =>
            toggled.reduce(
                (current, year) => setYearCoverage(current, year, null),
                line,
            ),
        ),
    };
};
