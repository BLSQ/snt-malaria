import React, { createContext, useContext, useEffect, useState } from 'react';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { sortByStringProp } from '../../planning/libs/list-utils';
import {
    InterventionAssignmentResponse,
    InterventionCategory,
    InterventionPlan,
} from '../../planning/types/interventions';
import { MetricTypeCategory } from '../../planning/types/metrics';
import { Scenario } from '../../scenarios/types';

type PlanningContextType = {
    scenarioId: number;
    scenario?: Scenario;
    displayOrgUnitId?: number;
    canEditScenario: boolean;
    orgUnits: OrgUnit[];
    metricTypeCategories: MetricTypeCategory[];
    interventionCategories: InterventionCategory[];
    interventionAssignments: InterventionAssignmentResponse[];
    interventionPlans: InterventionPlan[];
};

const PlanningContext = createContext<PlanningContextType>({
    scenarioId: 0,
    scenario: undefined,
    displayOrgUnitId: undefined,
    canEditScenario: false,
    orgUnits: [],
    metricTypeCategories: [],
    interventionCategories: [],
    interventionAssignments: [],
    interventionPlans: [],
});

export const usePlanningContext = () => useContext(PlanningContext);

export const PlanningProvider = ({
    scenarioId,
    scenario,
    displayOrgUnitId,
    canEditScenario,
    orgUnits,
    metricTypeCategories,
    interventionCategories,
    interventionAssignments,
    children,
}: {
    scenarioId: number;
    scenario?: Scenario;
    displayOrgUnitId?: number;
    canEditScenario: boolean;
    orgUnits: OrgUnit[];
    metricTypeCategories: MetricTypeCategory[];
    interventionCategories: InterventionCategory[];
    interventionAssignments: InterventionAssignmentResponse[];
    children: React.ReactNode;
}) => {
    const [interventionPlans, setInterventionPlans] = useState<
        InterventionPlan[]
    >([]);
    useEffect(() => {
        const plans = new Map<number, InterventionPlan>();
        interventionAssignments.forEach(assignment => {
            const intervention = plans.get(assignment.intervention.id) || {
                intervention: assignment.intervention,
                name: assignment.intervention.name,
                org_units: [],
            };
            intervention.org_units.push({
                id: assignment.org_unit.id,
                name: assignment.org_unit.name,
                intervention_assignment_id: assignment.id,
            });
            plans.set(assignment.intervention.id, intervention);
        });
        setInterventionPlans(
            plans ? sortByStringProp(Array.from(plans.values()), 'name') : [],
        );
    }, [interventionAssignments, setInterventionPlans]);

    return (
        <PlanningContext.Provider
            value={{
                scenarioId,
                scenario,
                displayOrgUnitId,
                canEditScenario,
                orgUnits,
                metricTypeCategories,
                interventionCategories,
                interventionAssignments,
                interventionPlans,
            }}
        >
            {children}
        </PlanningContext.Provider>
    );
};
