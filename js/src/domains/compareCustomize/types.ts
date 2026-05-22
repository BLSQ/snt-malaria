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

/**
 * Field names of metrics that come directly from the impact API response
 * (`ScenarioImpactMetrics`, `YearImpactMetrics`, `OrgUnitImpactMetrics`).
 * Use this when looking up values on impact payloads.
 */
export const ImpactMetricKey = {
    DirectDeaths: 'direct_deaths',
    Cases: 'number_cases',
    SevereCases: 'number_severe_cases',
    PrevalenceRate: 'prevalence_rate',
} as const;

export type ImpactMetricKey =
    (typeof ImpactMetricKey)[keyof typeof ImpactMetricKey];

/** Shared impact metric fields on scenario, year, and org-unit payloads. */
export type ImpactMetrics = {
    [K in ImpactMetricKey]: ImpactMetricWithConfidenceInterval;
};

/**
 * All metrics the UI can display, indexed for the unified MetricConfig registry
 * (see `useMetricConfig`). Superset of `ImpactMetricKey` plus metrics derived
 * from other sources (currently `OrgUnitTotalCost`, computed from the budget API).
 *
 * Use `MetricKey` for anything driven by `MetricConfig` (dropdown, formatter,
 * color direction). Use `ImpactMetricKey` when reading raw fields off impact
 * payloads.
 */
export const MetricKey = {
    ...ImpactMetricKey,
    OrgUnitTotalCost: 'org_unit_total_cost',
} as const;

export type MetricKey = (typeof MetricKey)[keyof typeof MetricKey];

export const IMPACT_METRIC_KEYS: readonly ImpactMetricKey[] =
    Object.values(ImpactMetricKey);

export type OrgUnitImpactMetrics = ImpactMetrics & {
    org_unit_id: number;
    org_unit_name: string;
};

export type YearImpactMetrics = ImpactMetrics & {
    year: number;
    org_units: OrgUnitImpactMetrics[];
};

export type ImpactProviderMeta = {
    provider_key: string;
};

export type ScenarioImpactMetrics = ImpactMetrics & {
    scenario_id: number;
    by_year: YearImpactMetrics[];
    org_units: OrgUnitImpactMetrics[];
    org_units_not_found: OrgUnitRef[];
    org_units_with_unmatched_interventions: OrgUnitRef[];
    provider_meta: ImpactProviderMeta;
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
