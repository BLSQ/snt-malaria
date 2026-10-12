import React, {
    createContext,
    Dispatch,
    SetStateAction,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { SidePanelProvider } from '../../../components/sidePanel/SidePanelProvider';
import { useGetBudgetSettings } from '../../../hooks/useGetBudgetSettings';
import { MetricTypeCategory } from '../../dataLayers/types/metrics';
import { InterventionCategory } from '../../interventions/types';
import { sortByStringProp } from '../../planning/libs/list-utils';
import { Scenario } from '../../scenarios/types';
import type { ExtraSlotState } from '../components/comparisonTab/useComparisonSlots';
import { getScenarioYears } from '../libs/override-utils';
import { Budget } from '../types/budget';
import {
    InterventionAssignmentResponse,
    InterventionPlan,
} from '../types/interventionAssignments';
import { PlanningTab } from '../types/planningTab';
import { ScenarioRule } from '../types/scenarioRule';

type PlanningContextType = {
    scenarioId: number;
    scenario?: Scenario;
    scenarioYears: number[];
    displayOrgUnitId?: number;
    canEditScenario: boolean; // This is oriented user, does he have the necessary permissions to edit the scenario
    isScenarioEditable: boolean; // This is oriented scenario, is it locked or not, if it's locked it can't be edited even if the user has permissions
    isEditing: boolean;
    editingRule: ScenarioRule | undefined;
    orgUnits: OrgUnit[];
    metricTypeCategories: MetricTypeCategory[];
    interventionCategories: InterventionCategory[];
    interventionAssignments: InterventionAssignmentResponse[];
    interventionPlans: InterventionPlan[];
    budgets: Budget[];
    currency: string;
    startEditingRule: (rule?: ScenarioRule) => void;
    stopEditingRule: () => void;
    activeTab: PlanningTab;
    setActiveTab: (tab: PlanningTab) => void;
    focusedOverrideInterventionId: number | undefined;
    /** Increments on every focusOverride call, so focusing the same intervention again re-triggers it. */
    overrideFocusRequest: number;
    focusOverride: (interventionId: number) => void;
    selectOverride: (interventionId: number) => void;
    mapMetricTypeId: number | undefined;
    setMapMetricTypeId: (metricTypeId: number | undefined) => void;
    showMetricOnMap: (metricTypeId: number) => void;
    overridesTabContainer: HTMLElement | null;
    setOverridesTabContainer: (element: HTMLElement | null) => void;
    // Comparison tab's slot selection, kept here (rather than local to the
    // tab) so it survives switching away from and back to the tab. Reset
    // whenever scenarioId changes, see the effect below.
    comparisonCurrentYear: number | undefined;
    setComparisonCurrentYear: Dispatch<SetStateAction<number | undefined>>;
    comparisonExtraSlots: ExtraSlotState[];
    setComparisonExtraSlots: Dispatch<SetStateAction<ExtraSlotState[]>>;
};

const PlanningContext = createContext<PlanningContextType>({
    scenarioId: 0,
    scenario: undefined,
    scenarioYears: [],
    displayOrgUnitId: undefined,
    canEditScenario: false,
    isScenarioEditable: false,
    isEditing: false,
    editingRule: undefined,
    orgUnits: [],
    metricTypeCategories: [],
    interventionCategories: [],
    interventionAssignments: [],
    interventionPlans: [],
    budgets: [],
    currency: '',
    startEditingRule: () => {},
    stopEditingRule: () => {},
    activeTab: 'map',
    setActiveTab: () => {},
    focusedOverrideInterventionId: undefined,
    overrideFocusRequest: 0,
    focusOverride: () => {},
    selectOverride: () => {},
    mapMetricTypeId: undefined,
    setMapMetricTypeId: () => {},
    showMetricOnMap: () => {},
    overridesTabContainer: null,
    setOverridesTabContainer: () => {},
    comparisonCurrentYear: undefined,
    setComparisonCurrentYear: () => {},
    comparisonExtraSlots: [],
    setComparisonExtraSlots: () => {},
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
    const [interventionPlans, setInterventionPlans] = useState<
        InterventionPlan[]
    >([]);
    const isScenarioEditable = scenario
        ? !scenario.is_locked && canEditScenario
        : canEditScenario;

    const scenarioYears = useMemo(() => getScenarioYears(scenario), [scenario]);
    const { data: budgetSettings } = useGetBudgetSettings();
    const currency = budgetSettings?.local_currency ?? '';

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

    const [activeTab, setActiveTab] = useState<PlanningTab>('map');
    // Locked scenarios open on the summary tab, on first load only.
    const didInitActiveTab = useRef(false);
    useEffect(() => {
        if (scenario && !didInitActiveTab.current) {
            didInitActiveTab.current = true;
            if (scenario.is_locked) {
                setActiveTab('summary');
            }
        }
    }, [scenario]);

    const [focusedOverrideInterventionId, setFocusedOverrideInterventionId] =
        useState<number | undefined>();
    const [overrideFocusRequest, setOverrideFocusRequest] = useState(0);
    const [mapMetricTypeId, setMapMetricTypeId] = useState<
        number | undefined
    >();
    const focusOverride = useCallback((interventionId: number) => {
        setFocusedOverrideInterventionId(interventionId);
        setOverrideFocusRequest(request => request + 1);
        setMapMetricTypeId(undefined);
        setActiveTab('overrides');
    }, []);

    const showMetricOnMap = useCallback((metricTypeId: number) => {
        setMapMetricTypeId(metricTypeId);
        setActiveTab('map');
    }, []);

    const [overridesTabContainer, setOverridesTabContainer] =
        useState<HTMLElement | null>(null);

    const [isEditing, setIsEditing] = useState(false);
    const [editingRule, setEditingRule] = useState<ScenarioRule | undefined>();
    const startEditingRule = useCallback((rule?: ScenarioRule) => {
        setEditingRule(rule);
        setIsEditing(true);
        setActiveTab('map');
    }, []);
    const stopEditingRule = useCallback(() => {
        setEditingRule(undefined);
        setIsEditing(false);
        setFocusedOverrideInterventionId(undefined);
        setMapMetricTypeId(undefined);
        setActiveTab('map');
    }, []);

    const [comparisonCurrentYear, setComparisonCurrentYear] = useState<
        number | undefined
    >(undefined);
    const [comparisonExtraSlots, setComparisonExtraSlots] = useState<
        ExtraSlotState[]
    >([]);
    const previousScenarioIdRef = useRef(scenarioId);
    useEffect(() => {
        if (previousScenarioIdRef.current !== scenarioId) {
            previousScenarioIdRef.current = scenarioId;
            setComparisonCurrentYear(undefined);
            setComparisonExtraSlots([]);
        }
    }, [scenarioId]);

    return (
        <PlanningContext.Provider
            value={{
                scenarioId,
                scenario,
                scenarioYears,
                displayOrgUnitId,
                canEditScenario,
                isScenarioEditable,
                orgUnits,
                metricTypeCategories,
                interventionCategories,
                interventionAssignments,
                interventionPlans,
                isEditing,
                editingRule,
                budgets,
                currency,
                startEditingRule,
                stopEditingRule,
                activeTab,
                setActiveTab,
                focusedOverrideInterventionId,
                overrideFocusRequest,
                focusOverride,
                selectOverride: setFocusedOverrideInterventionId,
                mapMetricTypeId,
                setMapMetricTypeId,
                showMetricOnMap,
                overridesTabContainer,
                setOverridesTabContainer,
                comparisonCurrentYear,
                setComparisonCurrentYear,
                comparisonExtraSlots,
                setComparisonExtraSlots,
            }}
        >
            <SidePanelProvider
                defaultOpen={!scenario?.is_locked}
                locked={isEditing}
            >
                {children}
            </SidePanelProvider>
        </PlanningContext.Provider>
    );
};
