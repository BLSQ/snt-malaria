import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { createTimeoutService } from '../../../services/timeoutService';
import { MetricTypeCategory } from '../../dataLayers/types/metrics';
import { InterventionCategory } from '../../interventions/types';
import { sortByStringProp } from '../../planning/libs/list-utils';
import { Scenario } from '../../scenarios/types';
import { useGetDefaultBudgetAssumptions } from '../hooks/useGetBudgetAssumptions';
import { useGetScenarioYearlyCostAssignments } from '../hooks/useGetScenarioYearlyCostAssignments';
import { useSaveScenarioYearlyCostAssignment } from '../hooks/useSaveScenarioYearlyCostAssignment';
import { Budget } from '../types/budget';
import {
    DefaultBudgetAssumptions,
    InterventionAssignmentResponse,
    InterventionPlan,
    ScenarioYearlyCostAssignment,
} from '../types/interventionAssignments';

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
    defaultBudgetAssumptions?: DefaultBudgetAssumptions;
    scenarioYearlyCostAssignments: ScenarioYearlyCostAssignment[];
    budgets: Budget[];
    saveYearlyCoverage: (params: SaveYearlyCoverageParams) => void;
    toggleIsEditing: () => void;
};

type SaveYearlyCoverageParams = {
    assignmentId?: number;
    costLineId: number;
    year: number;
    value: number;
};

const toCoverageKey = (costLineId: number, year: number) =>
    `${costLineId}-${year}`;

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
    defaultBudgetAssumptions: undefined,
    scenarioYearlyCostAssignments: [],
    budgets: [],
    saveYearlyCoverage: () => {},
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
    budgets,
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
    budgets: Budget[];
    children: React.ReactNode;
}) => {
    const DEBOUNCE_MS = 500;
    const [interventionPlans, setInterventionPlans] = useState<
        InterventionPlan[]
    >([]);
    const isScenarioEditable = scenario
        ? !scenario.is_locked && canEditScenario
        : canEditScenario;

    const { data: defaultBudgetAssumptions } = useGetDefaultBudgetAssumptions();
    const { data: scenarioYearlyCostAssignments = [] } =
        useGetScenarioYearlyCostAssignments(scenarioId);
    const { mutate: saveScenarioYearlyCostAssignment } =
        useSaveScenarioYearlyCostAssignment();
    const timeoutServiceRef = useRef(createTimeoutService());

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

    const saveYearlyCoverage = useCallback(
        ({
            assignmentId,
            costLineId,
            year,
            value,
        }: SaveYearlyCoverageParams) => {
            const debounceKey = toCoverageKey(costLineId, year);
            const parsedValue = Number(value);
            if (!Number.isFinite(parsedValue)) {
                return;
            }

            const clampedValue = Math.min(100, Math.max(0, parsedValue));

            timeoutServiceRef.current.debounce(
                debounceKey,
                () => {
                    saveScenarioYearlyCostAssignment({
                        id: assignmentId,
                        scenario: scenarioId,
                        costLine: costLineId,
                        year,
                        value: clampedValue,
                    });
                },
                DEBOUNCE_MS,
            );
        },
        [saveScenarioYearlyCostAssignment, scenarioId],
    );

    useEffect(
        () => () => {
            timeoutServiceRef.current.clearAll();
        },
        [],
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
                defaultBudgetAssumptions,
                scenarioYearlyCostAssignments,
                budgets,
                saveYearlyCoverage,
                toggleIsEditing,
            }}
        >
            {children}
        </PlanningContext.Provider>
    );
};
