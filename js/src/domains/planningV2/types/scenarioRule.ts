export type ScenarioRule = {
    id: number;
    scenario: number;
    name: string;
    priority: number;
    matching_criteria: MetricTypeCriterion[];
    org_unit_scope?: number[];
    color: string;
    org_units_matched?: number[];
    org_units_excluded?: string; // comma separated list of org unit ids
    org_units_included?: string; // comma separated list of org unit ids
    intervention_properties: InterventionProperties[];
};

export type InterventionProperties = {
    intervention?: number;
    category?: number;
    coverage: number;
};

export type MetricTypeCriterion = {
    metric_type?: number;
    operator: '>=' | '<=' | '==' | '!=' | '>' | '<';
    value?: number;
    string_value?: string;
};
