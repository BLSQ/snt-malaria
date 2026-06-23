import React, { FC, useCallback, useMemo, useState } from 'react';
import { Card } from '@mui/material';
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
    MainColumn,
    PaperFullHeight,
    PageContainer,
    SidebarColumn,
    SidebarLayout,
} from '../../components/styledComponents';
import { baseUrls } from '../../constants/urls';
import { useOnboarding } from '../../hooks/useOnboarding';

import { useGetMetricCategories } from '../dataLayers/hooks/useGetMetrics';
import { useGetInterventionCategories } from '../interventions/hooks/useGetInterventionCategories';
import { MESSAGES } from '../messages';
import { useDeleteScenario } from '../scenarios/hooks/useDeleteScenario';
import { useGetScenario } from '../scenarios/hooks/useGetScenarios';
import { useUpdateScenario } from '../scenarios/hooks/useUpdateScenario';
import { BudgetTable } from './components/budgeting/BudgetTable';
import { InterventionPlanHeader } from './components/interventionPlan/InterventionPlanHeader';
import { InterventionPlanMap } from './components/interventionPlanMap/InterventionPlanMap';
import { ScenarioRulesPanel } from './components/scenarioRule/ScenarioRulesPanel';
import { PlanningProvider } from './contexts/PlanningContext';
import { useGetAccountSettings } from './hooks/useGetAccountSettings';
import { useGetInterventionAssignments } from './hooks/useGetInterventionAssignments';
import { useGetLatestCalculatedBudget } from './hooks/useGetLatestCalculatedBudget';
import { useGetOrgUnits } from './hooks/useGetOrgUnits';
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

export const Planning: FC = () => {
    const { scenarioId, displayOrgUnitId } = useParamsObject(
        baseUrls.planning,
    ) as unknown as PlanningParams;

    const navigate = useNavigate();
    const redirectToReplace = useRedirectToReplace();

    const { data: scenario } = useGetScenario(scenarioId);
    const { formatMessage } = useSafeIntl();
    const [activeTab, setActiveTab] = useState('map');

    const { data: metricTypeCategories } = useGetMetricCategories('any');
    const { data: interventionCategories } = useGetInterventionCategories();
    const { data: accountSettings } = useGetAccountSettings();
    const interventionTypeId = accountSettings?.intervention_org_unit_type_id;
    const { data: orgUnits, isLoading: isLoadingOrgUnits } = useGetOrgUnits({
        orgUnitParentId: displayOrgUnitId,
        orgUnitTypeId: interventionTypeId,
        enabled: !!interventionTypeId,
    });

    const {
        data: scenarioRules,
        isFetching: isFetchingRules,
        isLoading: isLoadingRules,
    } = useGetScenarioRules(scenarioId);
    const { data: interventionAssignments } =
        useGetInterventionAssignments(scenarioId);
    const { data: budget } = useGetLatestCalculatedBudget(scenario?.id);

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
    const { mutate: previewScenarioRule, isLoading: isLoadingPreview } =
        usePreviewScenarioRule();

    const onSetTab = useCallback(
        (tab: string) => tab && setActiveTab(tab),
        [setActiveTab],
    );

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

    const hasNoRules = useMemo(
        () =>
            !isLoadingRules &&
            Array.isArray(scenarioRules) &&
            scenarioRules.length === 0,
        [isLoadingRules, scenarioRules],
    );

    // Guided tour when the scenario has no rules yet.
    // Walks creating a rule, the more menu, and lock;
    const tour = useOnboarding({
        id: 'planning.firstRun',
        enabled:
            Boolean(scenario) &&
            !scenario?.is_locked &&
            canEditScenario &&
            hasNoRules,
        documentation: {
            href: formatMessage(MESSAGES.planningTourDocumentationUrl),
        },
        steps: [
            {
                title: formatMessage(MESSAGES.tourCreateRuleTitle),
                description: formatMessage(MESSAGES.tourCreateRuleDescription),
                placement: 'right-start',
                shape: 'rect',
            },
            {
                title: formatMessage(MESSAGES.tourMoreActionsTitle),
                description: formatMessage(MESSAGES.tourMoreActionsDescription),
            },
            {
                title: formatMessage(MESSAGES.tourLockScenarioTitle),
                description: formatMessage(
                    MESSAGES.tourLockScenarioDescription,
                ),
            },
        ],
    });

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
            budgets={budget?.results || []}
        >
            {isLoadingOrgUnits && <LoadingSpinner />}
            <TopBar title={title} disableShadow sx={{ zIndex: 401 }} />
            <PageContainer>
                <SidebarLayout>
                    <SidebarColumn>
                        <ScenarioRulesPanel
                            onPreviewScenarioRule={onPreviewScenarioRule}
                            scenarioId={scenarioId}
                            rules={scenarioRules || []}
                            isLoading={isFetchingRules}
                            createRuleRef={tour.anchorRefs[0]}
                            matchedOrgUnitIds={matchedOrgUnitIds}
                            isLoadingPreview={isLoadingPreview}
                        />
                    </SidebarColumn>
                    <MainColumn>
                        <PaperFullHeight>
                            <Card sx={styles.card}>
                                <CardStyled
                                    header={
                                        <InterventionPlanHeader
                                            onTabChange={onSetTab}
                                            activeTab={activeTab}
                                            onDeleteScenario={
                                                handleDeleteScenario
                                            }
                                            onToggleLockScenario={
                                                handleToggleLockScenario
                                            }
                                            onOrgUnitChange={
                                                handleDisplayOrgUnitChange
                                            }
                                            selectedOrgUnitId={displayOrgUnitId}
                                            lockScenarioRef={tour.anchorRefs[2]}
                                            moreActionsRef={tour.anchorRefs[1]}
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
                                    {activeTab === 'budget' &&
                                        orgUnits &&
                                        budget && <BudgetTable />}
                                </CardStyled>
                            </Card>
                        </PaperFullHeight>
                    </MainColumn>
                </SidebarLayout>
            </PageContainer>
            {tour.element}
        </PlanningProvider>
    ) : null;
};
