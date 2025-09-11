import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';

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
    intervention_category: number;
    cost_unit: string;
    cost_line: InterventionCostLine[];
};

export type InterventionCostLine = {
    name: string;
    category: number;
    cost: number;
    id: number;
};

export type InterventionAssignmentCreate = {
    orgunit_interventions: { [orgUnitId: number]: number[] };
    scenario_id: number;
};

export type InterventionAssignmentResponse = {
    id: number;
    org_unit: OrgUnit;
    intervention: Intervention;
    scenario_id: number;
};

export type InterventionAssignment = {
    org_units: OrgUnit[];
    interventions: Intervention[];
    scenario_id: number;
};

export type InterventionPlan = {
    name: string;
    intervention: Intervention;
    org_units: InterventionOrgUnit[];
};

export type InterventionOrgUnit = {
    name: string;
    id: number;
    intervention_assignment_id: number;
};

export type Budget = {
    id: number;
    name: string;
    budget: number;
};
