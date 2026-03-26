import React, { FC, useCallback, useMemo, useState } from 'react';
import { Card, Grid } from '@mui/material';
import {
    LoadingSpinner,
    useRedirectToReplace,
    useSafeIntl,
} from 'bluesquare-components';
import { useNavigate } from 'react-router';
import TopBar from 'Iaso/components/nav/TopBarComponent';
import { useParamsObject } from 'Iaso/routing/hooks/useParamsObject';
import { SxStyles } from 'Iaso/types/general';
import { CardStyled } from '../../components/CardStyled';
import {
    PaperFullHeight,
    PageContainer,
} from '../../components/styledComponents';

import { baseUrls } from '../../constants/urls';
import { MESSAGES } from '../messages';
import { Budgeting } from '../planning/components/budgeting/Budgeting';
import { InterventionPlanDetails } from '../planning/components/interventionPlan/InterventionPlanDetails';
import { useCalculateBudget } from '../planning/hooks/useCalculateBudget';
import { useGetBudgetAssumptions } from '../planning/hooks/useGetBudgetAssumptions';
import { useGetInterventionCategories } from '../planning/hooks/useGetInterventionCategories';
import { useGetLatestCalculatedBudget } from '../planning/hooks/useGetLatestCalculatedBudget';
import { useGetMetricCategories } from '../planning/hooks/useGetMetrics';
import { useGetOrgUnits } from '../planning/hooks/useGetOrgUnits';
import { useRemoveManyOrgUnitsFromInterventionPlan } from '../planning/hooks/useRemoveOrgUnitFromInterventionPlan';
import {
    BudgetAssumptions,
    InterventionPlan,
} from '../planning/types/interventions';
import { useDeleteScenario } from '../scenarios/hooks/useDeleteScenario';
import { useGetScenario } from '../scenarios/hooks/useGetScenarios';
import { useUpdateScenario } from '../scenarios/hooks/useUpdateScenario';
import { InterventionPlanHeader } from './components/interventionPlan/InterventionPlanHeader';
import { InterventionPlanMap } from './components/interventionPlanMap/InterventionPlanMap';
import { InterventionsPlanTable } from './components/interventionPlanTable/InterventionsPlanTable';
import { ScenarioRulesPanel } from './components/scenarioRule/ScenarioRulesPanel';
import { PlanningProvider } from './contexts/PlanningContext';
import { useGetInterventionAssignments } from './hooks/useGetInterventionAssignments';
import { useGetScenarioRules } from './hooks/useGetScenarioRules';
import { usePreviewScenarioRule } from './hooks/usePreviewScenarioRule';
import { ScenarioRule } from './types/scenarioRule';
import { useUserCanEditScenario } from './utils/permissions';

const styles = {
    card: {
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
    },
} satisfies SxStyles;

type PlanningParams = {
    scenarioId: number;
    displayOrgUnitId?: number;
};

export const PlanningV2: FC = () => {
    const { scenarioId, displayOrgUnitId } = useParamsObject(
        baseUrls.planning,
    ) as unknown as PlanningParams;

    const navigate = useNavigate();
    const redirectToReplace = useRedirectToReplace();

    const { data: scenario } = useGetScenario(scenarioId);
    const { formatMessage } = useSafeIntl();
    const [activeTab, setActiveTab] = useState('map');

    const [selectedInterventionPlan, setSelectedInterventionPlan] = useState<
        InterventionPlan | undefined
    >(undefined);

    const { data: metricTypeCategories } = useGetMetricCategories();
    const { data: interventionCategories } = useGetInterventionCategories();
    const { data: orgUnits, isLoading: isLoadingOrgUnits } =
        useGetOrgUnits(displayOrgUnitId);

    const { data: scenarioRules, isFetching: isFetchingRules } =
        useGetScenarioRules(scenarioId);
    const { data: interventionAssignments } =
        useGetInterventionAssignments(scenarioId);
    const { data: budget } = useGetLatestCalculatedBudget(scenario?.id);

    const { mutate: runBudget, isLoading: isCalculatingBudget } =
        useCalculateBudget();

    const { mutateAsync: deleteScenario } = useDeleteScenario(() => {
        navigate('/');
    });

    const { mutateAsync: updateScenario } = useUpdateScenario(scenarioId);

    const handleDeleteScenario = () => {
        deleteScenario(scenarioId);
    };

    const handleToggleLockScenario = () => {
        if (scenario) {
            updateScenario({ ...scenario, is_locked: !scenario.is_locked });
        }
    };

    const canEditScenario = useUserCanEditScenario(scenario);

    const {
        mutate: removeManyOrgUnitsFromPlan,
        isLoading: isRemovingOrgUnits,
    } = useRemoveManyOrgUnitsFromInterventionPlan();

    const onRemoveOrgUnitsFromPlan = async (
        interventionAssignmentIds: number[],
        shouldCloseDrawer: boolean,
    ) => {
        removeManyOrgUnitsFromPlan(interventionAssignmentIds, {
            onSuccess: () => {
                if (shouldCloseDrawer) {
                    setSelectedInterventionPlan(undefined);
                }
            },
        });
    };

    const { data: budgetAssumptions } = useGetBudgetAssumptions(scenarioId);
    const selectedBudgetAssumptions: BudgetAssumptions | undefined = useMemo(
        () =>
            budgetAssumptions?.find(
                bs =>
                    bs.intervention_code ===
                    selectedInterventionPlan?.intervention.code,
            ),
        [selectedInterventionPlan, budgetAssumptions],
    );

    const handleDisplayOrgUnitChange = useCallback(
        (orgUnitId?: number) => {
            redirectToReplace(baseUrls.planning, {
                scenarioId: scenarioId.toString(),
                displayOrgUnitId: orgUnitId?.toString(),
            });
        },
        [scenarioId, redirectToReplace],
    );

    const title = useMemo(
        () =>
            scenario
                ? `${scenario.name} ${scenario.start_year} - ${scenario.end_year}`
                : formatMessage(MESSAGES.title),
        [scenario, formatMessage],
    );

    // TODO Find a better place for this
    const [matchedOrgUnitIds, setMatchedOrgUnitIds] = useState<number[]>([]);
    const [previewRule, setPreviewRule] = useState<
        Partial<ScenarioRule> | undefined
    >();
    const { mutate: previewScenarioRule } = usePreviewScenarioRule();

    const onPreviewScenarioRule = useCallback(
        (rule?: Partial<ScenarioRule>) => {
            setPreviewRule(rule);
            if (!rule) {
                setMatchedOrgUnitIds([]);
                return;
            }
            return previewScenarioRule(rule, {
                onSuccess: data => setMatchedOrgUnitIds(data as number[]),
            });
        },
        [previewScenarioRule],
    );

    return metricTypeCategories && interventionCategories ? (
        <PlanningProvider
            scenarioId={scenarioId}
            scenario={scenario}
            displayOrgUnitId={displayOrgUnitId}
            orgUnits={orgUnits || []}
            metricTypeCategories={metricTypeCategories}
            interventionCategories={interventionCategories}
            interventionAssignments={interventionAssignments || []}
            canEditScenario={canEditScenario}
        >
            {isLoadingOrgUnits && <LoadingSpinner />}
            <TopBar title={title} disableShadow sx={{ zIndex: 401 }} />
            <PageContainer>
                <Grid container spacing={1}>
                    <Grid item xs={12} md={4}>
                        <ScenarioRulesPanel
                            onPreviewScenarioRule={onPreviewScenarioRule}
                            scenarioId={scenarioId}
                            rules={scenarioRules || []}
                            isLoading={isFetchingRules}
                        />
                    </Grid>
                    <Grid item xs={12} md={8}>
                        <PaperFullHeight>
                            <Card sx={styles.card}>
                                <CardStyled
                                    header={
                                        <InterventionPlanHeader
                                            onTabChange={setActiveTab}
                                            activeTab={activeTab}
                                            onRunBudget={() =>
                                                runBudget(scenarioId)
                                            }
                                            onDeleteScenario={
                                                handleDeleteScenario
                                            }
                                            onToggleLockScenario={
                                                handleToggleLockScenario
                                            }
                                            isCalculatingBudget={
                                                isCalculatingBudget
                                            }
                                            onOrgUnitChange={
                                                handleDisplayOrgUnitChange
                                            }
                                            selectedOrgUnitId={displayOrgUnitId}
                                        />
                                    }
                                >
                                    {activeTab === 'map' && (
                                        <InterventionPlanMap
                                            matchedOrgUnitIds={
                                                matchedOrgUnitIds
                                            }
                                            previewRule={previewRule}
                                        />
                                    )}
                                    {activeTab === 'list' && (
                                        <>
                                            <InterventionsPlanTable
                                                showInterventionPlanDetails={
                                                    setSelectedInterventionPlan
                                                }
                                            />
                                            <InterventionPlanDetails
                                                interventionPlan={
                                                    selectedInterventionPlan
                                                }
                                                scenarioId={scenarioId}
                                                closeInterventionPlanDetails={() =>
                                                    setSelectedInterventionPlan(
                                                        undefined,
                                                    )
                                                }
                                                budgetAssumptions={
                                                    selectedBudgetAssumptions
                                                }
                                                removeOrgUnitsFromPlan={
                                                    onRemoveOrgUnitsFromPlan
                                                }
                                                isRemovingOrgUnits={
                                                    isRemovingOrgUnits
                                                }
                                                disabled={
                                                    scenario?.is_locked ||
                                                    !canEditScenario
                                                }
                                            />
                                        </>
                                    )}
                                    {activeTab === 'budget' &&
                                        orgUnits &&
                                        budget && (
                                            <Budgeting
                                                budgets={budget?.results}
                                                orgUnits={orgUnits}
                                            />
                                        )}
                                </CardStyled>
                            </Card>
                        </PaperFullHeight>
                    </Grid>
                </Grid>
            </PageContainer>
        </PlanningProvider>
    ) : null;
};
