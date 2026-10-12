export type ScenarioRule = {
    id: number;
    scenario: number;
    name: string;
    priority: number;
    matching_criteria: MetricTypeCriterion[];
    is_match_all?: boolean;
    org_unit_scope?: number[];
    color: string;
    org_units_matched?: number[];
    org_units_excluded?: string; // comma separated list of org unit ids
    org_units_included?: string; // comma separated list of org unit ids
    interventions: number[];
    intervention_overrides: RuleInterventionOverride[];
};

/** `coverage` is a percentage for population-based cost items and a quantity for fixed ones; `yearly_coverage` is keyed by year. */
export type RuleCostLineOverride = {
    cost_line: number;
    unit_cost: number | null;
    conversion_factor: number | null;
    buffer: number | null;
    coverage: number | null;
    yearly_coverage: Record<string, number>;
};

export type RuleInterventionOverride = {
    intervention: number;
    /** Null means deployed every year of the scenario. */
    deployment_years: number[] | null;
    grant: number | null;
    cost_lines: RuleCostLineOverride[];
};

export type MetricTypeCriterion = {
    metric_type?: number;
    operator: '>=' | '<=' | '==' | '!=' | '>' | '<';
    value?: number;
    string_value?: string;
};

export type ScenarioRulePreview = {
    rule: Pick<ScenarioRule, 'color' | 'interventions'>;
    matchedOrgUnitIds: number[];
};
