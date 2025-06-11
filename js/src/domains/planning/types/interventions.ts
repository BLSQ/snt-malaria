import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';

export type InterventionCategory = {
    id: number;
    name: string;
    description: string;
    interventions: Intervention[];
};

export type InterventionMix = {
    id: number;
    name: string;
    interventions: Intervention[];
};

export type Intervention = {
    id: number;
    name: string;
    cost_per_unit: number | null;
};

export type InterventionAssignment = {
    mix_name: string;
    orgunit_ids: number[];
    intervention_ids: number[];
    scenario_id: number;
};

export type InterventionPlan = {
    id: number;
    name: string;
    interventions: Intervention[];
    org_units: OrgUnit[];
};

export type Budget = {
    id: number;
    name: string;
    budget: number;
};
