export type ScenarioRule = {
    id: number;
    name: string;
    priority: number;
    matching_criterion: Record<number, ScenarioRuleCriteria>;
    org_unit_scope: number[];
    color: string;
    org_units_excluded: number[];
    org_units_included: number[];
    interventions: number[];
};

export type ScenarioRuleCriteria = {
    metricTypeId: number;
    operator: string;
    value: string | number;
};

export type InterventionRule = {
    intervention?: number;
    interventionCategory?: number;
    coverage: number;
};

export type MetricTypeRule = {
    metricType?: number;
    operator: string;
    value: number;
};
