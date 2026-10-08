import React, { FC, ReactNode, useCallback, useMemo, useState } from 'react';
import SettingsInputComponentOutlinedIcon from '@mui/icons-material/SettingsInputComponentOutlined';
import {
    LoadingSpinner,
    useRedirectToReplace,
    useSafeIntl,
} from 'bluesquare-components';
import { useNavigate } from 'react-router';
import TopBar from 'Iaso/components/nav/TopBarComponent';
import { useParamsObject } from 'Iaso/routing/hooks/useParamsObject';
import { SidePanel } from '../../components/sidePanel/SidePanel';
import {
    ChatColumn,
    MainColumn,
    PageContainer,
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
import { InterventionPlanHeader } from './components/interventionPlan/InterventionPlanHeader';
import { PlanningMainColumn } from './components/PlanningMainColumn';
import { ScenarioRuleAIChat } from './components/scenarioRule/scenarioRuleAiChat/ScenarioRuleAIChat';
import { useScenarioRuleAIChat } from './components/scenarioRule/scenarioRuleAiChat/useScenarioRuleAIChat';
import { ScenarioRulesActions } from './components/scenarioRule/scenarioRuleList/ScenarioRulesHeader';
import { ScenarioRulesPanel } from './components/scenarioRule/ScenarioRulesPanel';
import { PlanningProvider } from './contexts/PlanningContext';
import { useGetAccountSettings } from './hooks/useGetAccountSettings';
import { useGetInterventionAssignments } from './hooks/useGetInterventionAssignments';
import { useGetLatestCalculatedBudget } from './hooks/useGetLatestCalculatedBudget';
import { useGetOrgUnits } from './hooks/useGetOrgUnits';
import { useGetScenarioRules } from './hooks/useGetScenarioRules';
import { ScenarioRule, ScenarioRulePreview } from './types/scenarioRule';
import { useUserCanEditScenario } from './utils/permissions';

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

    const { data: metricTypeCategories } = useGetMetricCategories('any');
    const { data: interventionCategories } = useGetInterventionCategories();
    const { data: accountSettings } = useGetAccountSettings();
    const hasAiApiKey = Boolean(accountSettings?.has_ai_api_key);
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

    const handleDeleteScenario = useCallback(() => {
        deleteScenario(scenarioId);
    }, [deleteScenario, scenarioId]);

    const [showAIChat, setShowAIChat] = useState(false);
    const toggleAIChat = useCallback(() => setShowAIChat(v => !v), []);
    const {
        messages: aiChatMessages,
        isLoading: isAiChatLoading,
        sendMessage: sendAiChatMessage,
        revert: revertAiChatMessage,
        pendingAttachments: aiChatPendingAttachments,
        onAttachFiles: onAiChatAttachFiles,
        onRemoveAttachment: onAiChatRemoveAttachment,
    } = useScenarioRuleAIChat({ scenarioId, rules: scenarioRules || [] });

    const handleToggleLockScenario = useCallback(() => {
        if (scenario) {
            updateScenario({ ...scenario, is_locked: !scenario.is_locked });
        }
    }, [scenario, updateScenario]);

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

    const onPreviewScenarioRule = useCallback(
        (preview?: ScenarioRulePreview) => {
            setPreviewRule(preview?.rule);
            setMatchedOrgUnitIds(preview?.matchedOrgUnitIds ?? []);
        },
        [],
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

    const renderPlanHeader = useCallback(
        (tabActions?: ReactNode) => (
            <InterventionPlanHeader
                onDeleteScenario={handleDeleteScenario}
                onToggleLockScenario={handleToggleLockScenario}
                onOrgUnitChange={handleDisplayOrgUnitChange}
                selectedOrgUnitId={displayOrgUnitId}
                lockScenarioRef={tour.anchorRefs[2]}
                moreActionsRef={tour.anchorRefs[1]}
                tabActions={tabActions}
            />
        ),
        [
            handleDeleteScenario,
            handleToggleLockScenario,
            handleDisplayOrgUnitChange,
            displayOrgUnitId,
            tour.anchorRefs,
        ],
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
            budgets={budget?.results || []}
        >
            {isLoadingOrgUnits && <LoadingSpinner />}
            <TopBar title={title} disableShadow sx={{ zIndex: 401 }} />
            <PageContainer>
                <SidebarLayout>
                    {showAIChat && hasAiApiKey && (
                        <ChatColumn>
                            <ScenarioRuleAIChat
                                messages={aiChatMessages}
                                isLoading={isAiChatLoading}
                                onSendMessage={sendAiChatMessage}
                                onRevert={revertAiChatMessage}
                                pendingAttachments={aiChatPendingAttachments}
                                onAttachFiles={onAiChatAttachFiles}
                                onRemoveAttachment={onAiChatRemoveAttachment}
                            />
                        </ChatColumn>
                    )}
                    <SidePanel
                        icon={SettingsInputComponentOutlinedIcon}
                        actions={
                            <ScenarioRulesActions
                                hasAiApiKey={hasAiApiKey}
                                showAIChat={showAIChat}
                                onToggleAIChat={toggleAIChat}
                            />
                        }
                    >
                        <ScenarioRulesPanel
                            onPreviewScenarioRule={onPreviewScenarioRule}
                            scenarioId={scenarioId}
                            rules={scenarioRules || []}
                            isLoading={isFetchingRules}
                            createRuleRef={tour.anchorRefs[0]}
                            hasAiApiKey={hasAiApiKey}
                            showAIChat={showAIChat}
                            onToggleAIChat={toggleAIChat}
                        />
                    </SidePanel>
                    <MainColumn>
                        <PlanningMainColumn
                            renderHeader={renderPlanHeader}
                            matchedOrgUnitIds={matchedOrgUnitIds}
                            previewRule={previewRule}
                            isBudgetLoaded={Boolean(orgUnits && budget)}
                        />
                    </MainColumn>
                </SidebarLayout>
            </PageContainer>
            {tour.element}
        </PlanningProvider>
    ) : null;
};
