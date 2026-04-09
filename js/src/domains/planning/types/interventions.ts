import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { ScenarioRule } from './scenarioRule';
import { BudgetInterventionCostLine } from './budget';

export type InterventionCategory = {
    id: number;
    name: string;
    short_name: string;
    description: string;
    interventions: Intervention[];
};

export type Intervention = {
    id: number;
    name: string;
    short_name: string;
    code: string;
    description: string;
    intervention_category: number;
};

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

export type BudgetAssumptions = {
    id: number;
    intervention_code: string;
    scenario: number;
    coverage: number;
    buffer_mult: number;
    bale_size: number;
    divisor: number;
    doses_pr_pw: number;
    anc_coverage: number;
    monthly_rounds: number;
    // age_string: string;
    pop_prop_3_11: number;
    pop_prop_12_59: number;
    touchpoints: number;
    tablet_factor: number;
    doses_per_child: number;
    doses_per_pw: number;
};

export type InterventionDetails = {
    id: number;
    name: string;
    impact_ref: string;
    cost_breakdown_lines: InterventionCostBreakdownLine[];
};

export type InterventionCostBreakdownLine = {
    name: string;
    category: string;
    category_label: string;
    unit_type: string;
    unit_type_label: string;
    unit_cost: string; // using string to avoid float precision issues
    id: number;
    year: number;
    intervention: number;
};
