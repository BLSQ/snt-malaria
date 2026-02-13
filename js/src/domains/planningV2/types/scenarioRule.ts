export type ScenarioRule = {
    id: number;
    name: string;
    priority: number;
    matching_criterion: Record<number, MetricTypeCriteria>;
    org_unit_scope: number[];
    color: string;
    org_units_excluded: number[];
    org_units_included: number[];
    interventions: number[];
};

export type InterventionCriteria = {
    intervention?: number;
    interventionCategory?: number;
    coverage: number;
};

export type MetricTypeCriteria = {
    metricType?: number;
    operator: string;
    value?: number;
    string_value?: string;
};
