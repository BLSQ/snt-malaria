export type ScenarioId = number | '';

export type ScenarioOption = {
    label: string;
    value: number;
};

export type ScenarioDisplay = {
    id: number;
    label: string;
    color: string;
};

export type ImpactMetricWithConfidenceInterval = {
    value: number | null;
    lower: number | null;
    upper: number | null;
};

export type OrgUnitImpactMetrics = {
    org_unit_id: number;
    org_unit_name: string;
    number_cases: ImpactMetricWithConfidenceInterval;
    number_severe_cases: ImpactMetricWithConfidenceInterval;
    prevalence_rate: ImpactMetricWithConfidenceInterval;
    averted_cases: ImpactMetricWithConfidenceInterval;
    direct_deaths: ImpactMetricWithConfidenceInterval;
    cost?: number | null;
    cost_per_averted_case: ImpactMetricWithConfidenceInterval;
};

export type YearImpactMetrics = {
    year: number;
    number_cases: ImpactMetricWithConfidenceInterval;
    number_severe_cases: ImpactMetricWithConfidenceInterval;
    prevalence_rate: ImpactMetricWithConfidenceInterval;
    averted_cases: ImpactMetricWithConfidenceInterval;
    direct_deaths: ImpactMetricWithConfidenceInterval;
    cost: number | null;
    cost_per_averted_case: ImpactMetricWithConfidenceInterval;
    org_units: OrgUnitImpactMetrics[];
};

export type ScenarioImpactMetrics = {
    scenario_id: number;
    number_cases: ImpactMetricWithConfidenceInterval;
    number_severe_cases: ImpactMetricWithConfidenceInterval;
    prevalence_rate: ImpactMetricWithConfidenceInterval;
    averted_cases: ImpactMetricWithConfidenceInterval;
    direct_deaths: ImpactMetricWithConfidenceInterval;
    cost: number | null;
    cost_per_averted_case: ImpactMetricWithConfidenceInterval;
    by_year: YearImpactMetrics[];
    org_units: OrgUnitImpactMetrics[];
};

export type ImpactYearRange = {
    min_year: number;
    max_year: number;
};

export type ImpactAgeGroups = {
    age_groups: string[];
};

export const toNumericId = (id: ScenarioId): number | undefined =>
    id !== '' ? Number(id) : undefined;
