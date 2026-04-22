import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from 'react';
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
    canEditScenario: boolean; // This is oriented user, does he have the necessary permissions to edit the scenario
    isScenarioEditable: boolean; // This is oriented scenario, is it locked or not, if it's locked it can't be edited even if the user has permissions
    isEditing: boolean;
    orgUnits: OrgUnit[];
    metricTypeCategories: MetricTypeCategory[];
    interventionCategories: InterventionCategory[];
    interventionAssignments: InterventionAssignmentResponse[];
    interventionPlans: InterventionPlan[];
    toggleIsEditing: () => void;
};

const PlanningContext = createContext<PlanningContextType>({
    scenarioId: 0,
    scenario: undefined,
    displayOrgUnitId: undefined,
    canEditScenario: false,
    isScenarioEditable: false,
    isEditing: false,
    orgUnits: [],
    metricTypeCategories: [],
    interventionCategories: [],
    interventionAssignments: [],
    interventionPlans: [],
    toggleIsEditing: () => {},
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
    const isScenarioEditable = scenario
        ? !scenario.is_locked && canEditScenario
        : canEditScenario;

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

    const [isEditing, setIsEditing] = useState(false);
    const toggleIsEditing = useCallback(
        () => setIsEditing(e => !e),
        [setIsEditing],
    );

    return (
        <PlanningContext.Provider
            value={{
                scenarioId,
                scenario,
                displayOrgUnitId,
                canEditScenario,
                isScenarioEditable,
                orgUnits,
                metricTypeCategories,
                interventionCategories,
                interventionAssignments,
                interventionPlans,
                isEditing,
                toggleIsEditing,
            }}
        >
            {children}
        </PlanningContext.Provider>
    );
};
