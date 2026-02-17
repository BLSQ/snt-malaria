export type ScenarioRule = {
    id: number;
    name: string;
    priority: number;
    matching_criteria: Record<number, MetricTypeCriterion>;
    org_unit_scope?: number[];
    color: string;
    org_units_matched: number[];
    org_units_excluded?: number[];
    org_units_included?: number[];
    intervention_properties: InterventionProperties[];
};

export type InterventionProperties = {
    intervention?: number;
    interventionCategory?: number;
};

export type MetricTypeCriterion = {
    metricType?: number;
    operator: string;
    value?: number;
    string_value?: string;
};
