import React, { FC, useCallback, useState } from 'react';
import { Grid } from '@mui/material';
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
import { InterventionsPlan } from '../planning/components/interventionPlan/InterventionsPlan';
import { ScenarioTopBar } from '../planning/components/ScenarioTopBar';
import { useGetInterventionAssignments } from '../planning/hooks/useGetInterventionAssignments';
import { useGetInterventionCategories } from '../planning/hooks/useGetInterventionCategories';
import { useGetLatestCalculatedBudget } from '../planning/hooks/useGetLatestCalculatedBudget';
import { useGetMetricCategories } from '../planning/hooks/useGetMetrics';
import { useGetOrgUnits } from '../planning/hooks/useGetOrgUnits';
import { useGetScenario } from '../scenarios/hooks/useGetScenarios';
import { ScenarioRulesContainer } from './components/scenarioRule/ScenarioRulesContainer';
import { PlanningProvider } from './contexts/PlanningContext';
import { useGetScenarioRules } from './hooks/useGetScenarioRules';
import { useRefreshAssignments } from './hooks/useRefreshInterventionAssignment';
import { useReorderScenarioRules as useReorderScenarioRules } from './hooks/useReorderScenarioRules';
import { ScenarioRule } from './types/scenarioRule';

type PlanningParams = {
    scenarioId: number;
};

export const PlanningV2: FC = () => {
    const params = useParamsObject(
        baseUrls.planning,
    ) as unknown as PlanningParams;
    const { data: scenario } = useGetScenario(params.scenarioId);
    const { formatMessage } = useSafeIntl();

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { data: metricTypeCategories } = useGetMetricCategories();
    const { data: interventionCategories } = useGetInterventionCategories();
    const { data: orgUnits, isLoading: isLoadingOrgUnits } = useGetOrgUnits();

    const { data: interventionPlans, isLoading: isLoadingPlans } =
        useGetInterventionAssignments(params.scenarioId);
    const { data: scenarioRules, isLoading: isFetchingRules } =
        useGetScenarioRules(params.scenarioId);
    const { data: budget } = useGetLatestCalculatedBudget(scenario?.id);

    const { mutate: refreshAssignments } = useRefreshAssignments(
        params.scenarioId,
    );

    const { mutate: reorderScenarioRules } = useReorderScenarioRules(
        params.scenarioId,
    );

    const onReorderRules = useCallback(
        (newRules: ScenarioRule[]) => {
            reorderScenarioRules(newRules.map(r => r.id));
        },
        [reorderScenarioRules],
    );

    const onApplyRules = useCallback(() => {
        refreshAssignments({});
    }, [refreshAssignments]);

    return metricTypeCategories && interventionCategories ? (
        <PlanningProvider
            scenarioId={params.scenarioId}
            orgUnits={orgUnits || []}
            metricTypeCategories={metricTypeCategories}
            interventionCategories={interventionCategories}
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
                                scenarioId={params.scenarioId}
                                rules={scenarioRules || []}
                                isLoading={isFetchingRules}
                                onReorderRules={onReorderRules}
                            />
                        </PaperFullHeight>
                    </Grid>
                    <Grid item xs={12} md={8}>
                        <InterventionsPlan
                            scenarioId={params.scenarioId}
                            disabled={scenario?.is_locked}
                            interventionPlans={interventionPlans || []}
                            isLoadingPlans={isLoadingPlans}
                            totalOrgUnitCount={orgUnits?.length || 0}
                        />
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
