export type InterventionCategory = {
    id: number;
    name: string;
    description: string;
    interventions: Intervention[];
};

export type Intervention = {
    id: number;
    name: string;
    cost_per_unit: number | null;
};

export type InterventionAssignment = {
    orgunit_ids: number[];
    intervention_ids: number[];
    scenario_id: number;
};

export type InterventionPlan = {
    id: number;
    name: string;
    interventions: Intervention[];
};
