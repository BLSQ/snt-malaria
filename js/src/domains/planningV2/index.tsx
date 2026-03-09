import React, { FC, useCallback, useState } from 'react';
import {
    Card,
    CardContent,
    CardHeader,
    Grid,
    ToggleButton,
    ToggleButtonGroup,
} from '@mui/material';
import { LoadingSpinner, useSafeIntl } from 'bluesquare-components';
import TopBar from 'Iaso/components/nav/TopBarComponent';
import { useParamsObject } from 'Iaso/routing/hooks/useParamsObject';
import {
    PaperFullHeight,
    PageContainer,
} from '../../components/styledComponents';

import { baseUrls } from '../../constants/urls';
import { MESSAGES } from '../messages';
import { Budgeting } from '../planning/components/budgeting/Budgeting';
import { InterventionPlanDetails } from '../planning/components/interventionPlan/InterventionPlanDetails';
import { ScenarioTopBar } from '../planning/components/ScenarioTopBar';
import { useGetInterventionCategories } from '../planning/hooks/useGetInterventionCategories';
import { useGetLatestCalculatedBudget } from '../planning/hooks/useGetLatestCalculatedBudget';
import { useGetMetricCategories } from '../planning/hooks/useGetMetrics';
import { useGetOrgUnits } from '../planning/hooks/useGetOrgUnits';
import { useRemoveManyOrgUnitsFromInterventionPlan } from '../planning/hooks/useRemoveOrgUnitFromInterventionPlan';
import { InterventionPlan } from '../planning/types/interventions';
import { useGetScenario } from '../scenarios/hooks/useGetScenarios';
import { InterventionsPlanMap } from './components/InterventionPlanMap/InterventionPlanMap';
import { InterventionsPlanTable } from './components/InterventionPlanTable.tsx/InterventionsPlanTable';
import { ScenarioRulesContainer } from './components/scenarioRule/ScenarioRulesContainer';
import { PlanningProvider } from './contexts/PlanningContext';
import { useGetInterventionAssignments } from './hooks/useGetInterventionAssignments';
import { useGetScenarioRules } from './hooks/useGetScenarioRules';
import { useRefreshAssignments } from './hooks/useRefreshInterventionAssignment';

type PlanningParams = {
    scenarioId: number;
};

export const PlanningV2: FC = () => {
    const { scenarioId } = useParamsObject(
        baseUrls.planning,
    ) as unknown as PlanningParams;
    const { data: scenario } = useGetScenario(scenarioId);
    const { formatMessage } = useSafeIntl();
    const [activeTab, setActiveTab] = useState('map');

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [selectedInterventionPlan, setSelectedInterventionPlan] = useState<
        InterventionPlan | undefined
    >(undefined);
    const { data: metricTypeCategories } = useGetMetricCategories();
    const { data: interventionCategories } = useGetInterventionCategories();
    const { data: orgUnits, isLoading: isLoadingOrgUnits } = useGetOrgUnits();

    const { data: scenarioRules, isFetching: isFetchingRules } =
        useGetScenarioRules(scenarioId);
    const { data: interventionAssignments } =
        useGetInterventionAssignments(scenarioId);
    const { data: budget } = useGetLatestCalculatedBudget(scenario?.id);

    const { mutate: refreshAssignments } = useRefreshAssignments(scenarioId);

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
    const onApplyRules = useCallback(() => {
        refreshAssignments({});
    }, [refreshAssignments]);

    return metricTypeCategories && interventionCategories ? (
        <PlanningProvider
            scenarioId={scenarioId}
            orgUnits={orgUnits || []}
            metricTypeCategories={metricTypeCategories}
            interventionCategories={interventionCategories}
            interventionAssignments={interventionAssignments || []}
        >
            {isLoadingOrgUnits && <LoadingSpinner />}
            <TopBar title={formatMessage(MESSAGES.title)} disableShadow />
            <PageContainer>
                {scenario && (
                    <ScenarioTopBar
                        scenario={scenario}
                        isSidebarOpen={isSidebarOpen}
                        onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
                    />
                )}
                <Grid container spacing={1}>
                    <Grid item xs={12} md={4}>
                        <PaperFullHeight>
                            <ScenarioRulesContainer
                                onApplyRules={onApplyRules}
                                scenarioId={scenarioId}
                                rules={scenarioRules || []}
                                isLoading={isFetchingRules}
                            />
                        </PaperFullHeight>
                    </Grid>
                    <Grid item xs={12} md={8}>
                        <Card
                            sx={{
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                            }}
                        >
                            <CardHeader
                                sx={{
                                    borderBottom:
                                        '1px solid rgba(0, 0, 0, 0.12)',
                                }}
                                title={
                                    <ToggleButtonGroup
                                        value={activeTab}
                                        size="small"
                                        onChange={(_, value) =>
                                            setActiveTab(value)
                                        }
                                        exclusive
                                    >
                                        <ToggleButton value="map" key="map">
                                            Map
                                        </ToggleButton>
                                        <ToggleButton value="list" key="list">
                                            List
                                        </ToggleButton>
                                    </ToggleButtonGroup>
                                }
                            />

                            <CardContent sx={{ flexGrow: 1 }}>
                                {activeTab === 'map' && (
                                    <InterventionsPlanMap />
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
                                            removeOrgUnitsFromPlan={
                                                onRemoveOrgUnitsFromPlan
                                            }
                                            isRemovingOrgUnits={
                                                isRemovingOrgUnits
                                            }
                                        />
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                    {orgUnits && budget && (
                        <Budgeting
                            budgets={budget?.results}
                            orgUnits={orgUnits}
                        />
                    )}
                </Grid>
            </PageContainer>
        </PlanningProvider>
    ) : null;
};
