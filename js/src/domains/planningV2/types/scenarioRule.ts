export type ScenarioRule = {
    id?: number;
    scenario: number;
    name: string;
    priority: number;
    matching_criteria: MetricTypeCriterion[];
    org_unit_scope?: number[];
    color: string;
    org_units_matched?: number[];
    org_units_excluded?: number[];
    org_units_included?: number[];
    intervention_properties: InterventionProperties[];
};

export type InterventionProperties = {
    intervention?: number;
    category?: number;
    coverage: number;
};

export type MetricTypeCriterion = {
    metric_type?: number;
    operator: string;
    value?: number;
    string_value?: string;
};
