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

export type OrgUnitRef = {
    org_unit_id: number;
    org_unit_name: string;
};

export type OrgUnitImpactMetrics = {
    org_unit_id: number;
    org_unit_name: string;
    number_cases: ImpactMetricWithConfidenceInterval;
    number_severe_cases: ImpactMetricWithConfidenceInterval;
    prevalence_rate: ImpactMetricWithConfidenceInterval;
    direct_deaths: ImpactMetricWithConfidenceInterval;
};

export type YearImpactMetrics = {
    year: number;
    number_cases: ImpactMetricWithConfidenceInterval;
    number_severe_cases: ImpactMetricWithConfidenceInterval;
    prevalence_rate: ImpactMetricWithConfidenceInterval;
    direct_deaths: ImpactMetricWithConfidenceInterval;
    org_units: OrgUnitImpactMetrics[];
};

export type ScenarioImpactMetrics = {
    scenario_id: number;
    number_cases: ImpactMetricWithConfidenceInterval;
    number_severe_cases: ImpactMetricWithConfidenceInterval;
    prevalence_rate: ImpactMetricWithConfidenceInterval;
    direct_deaths: ImpactMetricWithConfidenceInterval;
    by_year: YearImpactMetrics[];
    org_units: OrgUnitImpactMetrics[];
    org_units_not_found: OrgUnitRef[];
    org_units_with_unmatched_interventions: OrgUnitRef[];
};

export type ScenarioMatchWarning = {
    scenario: ScenarioDisplay;
    orgUnits: OrgUnitRef[];
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
