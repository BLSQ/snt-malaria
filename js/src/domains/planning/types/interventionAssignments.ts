import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { Intervention } from '../../interventions/types';
import { ScenarioRule } from './scenarioRule';

export type InterventionAssignmentCreate = {
    orgunit_interventions: { [orgUnitId: number]: number[] };
    scenario_id: number;
    showDiffSnackbar?: boolean;
};

export type InterventionAssignmentResponse = {
    id: number;
    org_unit: OrgUnit;
    intervention: Intervention;
    rule: ScenarioRule | null;
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

export type DefaultBudgetAssumptions = {
    [interventionCode: string]: {
        coverage: number;
    };
};

export type BudgetAssumptions = {
    id: number;
    intervention_assignment: number;
    year?: number;
    scenario: number;
    coverage: number;
};
