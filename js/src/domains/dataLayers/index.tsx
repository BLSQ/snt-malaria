import React, {
    FC,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { Card, Stack } from '@mui/material';
import { LoadingSpinner, useSafeIntl } from 'bluesquare-components';
import TopBar from 'Iaso/components/nav/TopBarComponent';
import { useGetPipelineConfig } from 'Iaso/domains/openHexa/hooks/useGetPipelineConfig';
import { userHasPermission } from 'Iaso/domains/users/utils';
import { useParamsObject } from 'Iaso/routing/hooks/useParamsObject';

import { SxStyles } from 'Iaso/types/general';
import { useCurrentUser } from 'Iaso/utils/usersUtils';
import { CardStyled } from '../../components/CardStyled';
import {
    MainColumn,
    PageContainer,
    PaperFullHeight,
    SidebarColumn,
    SidebarLayout,
} from '../../components/styledComponents';
import { SETTINGS_WRITE } from '../../constants/permissions';
import { baseUrls } from '../../constants/urls';
import { useOnboarding } from '../../hooks/useOnboarding';
import {
    CompositeLayerEditor,
    CompositeLayerEditorHandle,
} from '../compositeLayerEditor';
import { CompositeLayerAIChat } from '../compositeLayerEditor/compositeLayerChatBot/CompositeLayerAIChat';
import {
    CurrentGraph,
    GeneratedGraph,
} from '../compositeLayerEditor/compositeLayerChatBot/types';
import { useCompositeLayerAIChat } from '../compositeLayerEditor/compositeLayerChatBot/useCompositeLayerAIChat';
import { useGetCompositeLayers } from '../compositeLayerEditor/hooks/useGetCompositeLayers';
import {
    CompositeSidebarTab,
    CompositeSidebarTabs,
} from '../compositeLayerEditor/nodeLibrary/CompositeSidebarTabs';
import { NodeLibrary } from '../compositeLayerEditor/nodeLibrary/NodeLibrary';
import { NodeLibrarySearch } from '../compositeLayerEditor/nodeLibrary/NodeLibrarySearch';
import { CompositeLayerListItem } from '../compositeLayerEditor/types/compositeLayer';
import { useGetAccountSettings } from '../planning/hooks/useGetAccountSettings';
import { useGetOrgUnits } from '../planning/hooks/useGetOrgUnits';
import { DataLayerComparisonProvider } from './contexts/DataLayerComparisonContext';
import { DataLayerComparisonContainer } from './dataLayerComparison/dataLayerComparisonContainer';
import { DataLayerDialog } from './dataLayerForm/DataLayerDialog';
import { DataLayerList } from './dataLayerList/DataLayerList';
import { DataLayerListHeader } from './dataLayerList/DataLayerListHeader';
import { DataLayerMapWrapper } from './dataLayerMap/DataLayerMapWrapper';
import { DataLayerWizardMain } from './dataLayerWizard/DataLayerWizardMain';
import { DataLayerWizardPanel } from './dataLayerWizard/DataLayerWizardPanel';
import { DiscardWizardModal } from './dataLayerWizard/DiscardWizardModal';
import { useDataLayerWizardController } from './dataLayerWizard/useDataLayerWizardController';
import { WizardLegendPreview } from './dataLayerWizard/WizardLegendPreview';
import { WizardPreviewPlaceholder } from './dataLayerWizard/WizardPreviewPlaceholder';
import { useDeleteMetricType } from './hooks/useDeleteMetricType';
import { useGetMetricCategories } from './hooks/useGetMetrics';
import { useGetOpenHexaDataLayers } from './hooks/useGetOpenHexaDataLayers';
import { useGetOpenHexaImportStatus } from './hooks/useGetOpenHexaImportStatus';
import { useImportOpenHexaDataLayer } from './hooks/useImportOpenHexaDataLayer';
import { MESSAGES } from './messages';
import { MetricType } from './types/metrics';

const styles = {
    card: {
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
    },
} satisfies SxStyles;

type DataLayersParams = {
    displayOrgUnitId?: number;
};

export const DataLayers: FC = () => {
    const { formatMessage } = useSafeIntl();
    const { displayOrgUnitId } = useParamsObject(
        baseUrls.dataLayers,
    ) as unknown as DataLayersParams;
    const currentUser = useCurrentUser();
    const showCompositeLayers = userHasPermission(SETTINGS_WRITE, currentUser);

    const { data: pipelineConfig } = useGetPipelineConfig();
    const showOpenHexaLayers = Boolean(
        pipelineConfig?.configured &&
        pipelineConfig?.config?.snt_configuration_dataset,
    );
    // Warm the cache so the data-layer picker is ready before the dialog opens.
    useGetOpenHexaDataLayers(showOpenHexaLayers);
    // Also refetches the layer list + values when an import task it tracked completes.
    const { data: openHexaImportStatus } =
        useGetOpenHexaImportStatus(showOpenHexaLayers);

    const [displayedMetricType, setDisplayedMetricType] =
        useState<MetricType>();
    const { data: accountSettings } = useGetAccountSettings();
    const hasAiApiKey = Boolean(accountSettings?.has_ai_api_key);
    const interventionTypeId = accountSettings?.intervention_org_unit_type_id;
    const { data: orgUnits } = useGetOrgUnits({
        orgUnitParentId: displayOrgUnitId,
        orgUnitTypeId: interventionTypeId,
        enabled: !!interventionTypeId,
    });

    const { data: metricCategories, isLoading: isLoadingMetricLayers } =
        useGetMetricCategories();

    // Keep the displayed layer pointing at the freshest data, so the map's legend + values refresh
    // right after an edit (e.g. changing a composite's legend) instead of only on re-selection.
    useEffect(() => {
        if (!displayedMetricType) return;
        const fresh = (metricCategories ?? [])
            .flatMap(category => category.items)
            .find(item => item.id === displayedMetricType.id);
        if (fresh && fresh !== displayedMetricType) {
            setDisplayedMetricType(fresh);
        }
    }, [metricCategories, displayedMetricType]);
    const existingCategoryOptions = useMemo(
        () =>
            (metricCategories ?? []).map(category => ({
                label: category.name,
                value: category.name,
            })),
        [metricCategories],
    );

    const { mutate: deleteMetricType } = useDeleteMetricType();
    const { mutate: importOpenHexaDataLayer } = useImportOpenHexaDataLayer();
    const refreshOpenHexaLayer = useCallback(
        (metricType: MetricType) =>
            importOpenHexaDataLayer({ code: metricType.code }),
        [importOpenHexaDataLayer],
    );

    const [isMetricTypeFormOpen, setIsMetricTypeFormOpen] =
        useState<boolean>(false);

    const [isCompositeEditorOpen, setIsCompositeEditorOpen] =
        useState<boolean>(false);
    const [editingCompositeLayerId, setEditingCompositeLayerId] = useState<
        number | undefined
    >(undefined);
    const compositeLayerEditorRef = useRef<CompositeLayerEditorHandle>(null);
    const onGenerateCompositeLayerGraph = useCallback(
        (graph: GeneratedGraph) => {
            compositeLayerEditorRef.current?.applyGeneratedGraph(graph);
        },
        [],
    );
    const getCurrentCompositeLayerGraph = useCallback(
        () => compositeLayerEditorRef.current?.getCurrentGraph() ?? null,
        [],
    );
    const onRestoreCompositeLayerGraph = useCallback(
        (graph: CurrentGraph | null) => {
            compositeLayerEditorRef.current?.restoreGraph(graph);
        },
        [],
    );
    const {
        messages: aiChatMessages,
        isLoading: isAiChatLoading,
        sendMessage: sendAiChatMessage,
        revert: revertAiChatMessage,
        reset: resetAiChat,
        pendingAttachments: aiChatPendingAttachments,
        onAttachFiles: onAttachAiChatFiles,
        onRemoveAttachment: onRemoveAiChatAttachment,
    } = useCompositeLayerAIChat({
        getCurrentGraph: getCurrentCompositeLayerGraph,
        onGenerate: onGenerateCompositeLayerGraph,
        onRestoreGraph: onRestoreCompositeLayerGraph,
    });

    const { data: compositeLayers } =
        useGetCompositeLayers(showCompositeLayers);
    const compositeLayerByMetricType = useMemo(() => {
        const map = new Map<number, CompositeLayerListItem>();
        (compositeLayers ?? []).forEach(layer => {
            if (layer.metric_type) {
                map.set(layer.metric_type, layer);
            }
        });
        return map;
    }, [compositeLayers]);
    const compositeLayerIdByMetricType = useMemo(
        () =>
            new Map(
                [...compositeLayerByMetricType].map(([metricTypeId, layer]) => [
                    metricTypeId,
                    layer.id,
                ]),
            ),
        [compositeLayerByMetricType],
    );

    // Collapsible data layers sidebar (mirrors the scenario editor's rules-panel toggle).
    const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
    const toggleSidebar = useCallback(() => {
        setSidebarCollapsed(collapsed => !collapsed);
    }, []);

    // Only meaningful while the composite editor is open, and only when there is an AI key.
    const [sidebarTab, setSidebarTab] =
        useState<CompositeSidebarTab>('library');
    // Owned here: the field sits in the card header, the filtering happens in its content.
    const [nodeSearchTerm, setNodeSearchTerm] = useState<string>('');
    const isAiChatTab = sidebarTab === 'ai' && hasAiApiKey;

    const [selectedMetricType, setSelectedMetricType] = useState<MetricType>();

    const onDialogClose = useCallback(() => {
        setIsMetricTypeFormOpen(false);
        setSelectedMetricType(undefined);
    }, [setIsMetricTypeFormOpen, setSelectedMetricType]);

    // "Edit Layer" always opens the legend editor, for composites and regular layers alike.
    const onEditMetricType = useCallback((metricType: MetricType) => {
        setSelectedMetricType(metricType);
        setIsMetricTypeFormOpen(true);
    }, []);

    const onEditCompositeLayer = useCallback((compositeLayerId: number) => {
        setEditingCompositeLayerId(compositeLayerId);
        setIsCompositeEditorOpen(true);
    }, []);

    // The dialogue persists the new composite; we then open the editor to build its graph.
    const onCompositeCreated = useCallback(
        (compositeLayerId: number) => {
            onDialogClose();
            onEditCompositeLayer(compositeLayerId);
        },
        [onDialogClose, onEditCompositeLayer],
    );

    const onCloseCompositeEditor = useCallback(() => {
        setIsCompositeEditorOpen(false);
        setEditingCompositeLayerId(undefined);
        setSidebarCollapsed(false);
        setSidebarTab('library');
        setNodeSearchTerm('');
        resetAiChat();
    }, [resetAiChat]);

    // After saving, close the editor and show the resulting composite layer on the map.
    const onCompositeSaved = useCallback(
        (metricType?: MetricType) => {
            onCloseCompositeEditor();
            if (metricType) {
                setDisplayedMetricType(metricType);
            }
        },
        [onCloseCompositeEditor],
    );

    // Four-step creation wizard (Type -> Details -> Legend -> Data/Graph); editing
    // an existing layer still goes through DataLayerDialog below.
    const onWizardCreated = useCallback((metricType?: MetricType) => {
        if (metricType) {
            setDisplayedMetricType(metricType);
        }
    }, []);
    const wizard = useDataLayerWizardController({
        onCreated: onWizardCreated,
        categoryOptions: existingCategoryOptions,
        onClosed: onCloseCompositeEditor,
    });

    // The composite node editor runs both for "Edit graph" and, inside the creation
    // wizard, as its Data step (Turn 2a keeps the editor in the flow).
    const activeCompositeLayerId =
        editingCompositeLayerId ?? wizard.compositeLayerId;
    const isCompositeEditorActive =
        isCompositeEditorOpen || wizard.isCompositeGraphStep;

    // The wizard's graph step persisted the graph — restore the sidebar (the user
    // may have collapsed it) and let the wizard finalise the layer.
    const onWizardGraphSaved = useCallback(
        (metricType?: MetricType) => {
            setSidebarCollapsed(false);
            wizard.onCompositeGraphSaved(metricType);
        },
        [wizard],
    );

    // Keeps the edited composite selected in the list while the editor is open.
    const editedCompositeMetricTypeId = useMemo(
        () =>
            (compositeLayers ?? []).find(
                layer => layer.id === activeCompositeLayerId,
            )?.metric_type ?? undefined,
        [compositeLayers, activeCompositeLayerId],
    );

    // Wizard "Next: Legend" on the composite graph step: persist the graph via the
    // editor, whose onSaved advances the wizard.
    const handleCompositeNext = useCallback(() => {
        compositeLayerEditorRef.current?.saveGraph();
    }, []);

    // Node library + AI tabs — the sidebar content for the composite node editor,
    // shared by the standalone "Edit graph" flow and the creation wizard's graph step.
    const compositeSidebar = !isCompositeEditorActive ? null : (
        <CardStyled
            flushContent={isAiChatTab}
            header={
                <>
                    <CompositeSidebarTabs
                        tab={sidebarTab}
                        onChangeTab={setSidebarTab}
                        showTabs={hasAiApiKey}
                    />
                    {!isAiChatTab && (
                        <NodeLibrarySearch
                            value={nodeSearchTerm}
                            onChange={setNodeSearchTerm}
                        />
                    )}
                </>
            }
        >
            {isAiChatTab ? (
                <CompositeLayerAIChat
                    messages={aiChatMessages}
                    isLoading={isAiChatLoading}
                    onSendMessage={sendAiChatMessage}
                    onRevert={revertAiChatMessage}
                    pendingAttachments={aiChatPendingAttachments}
                    onAttachFiles={onAttachAiChatFiles}
                    onRemoveAttachment={onRemoveAiChatAttachment}
                />
            ) : (
                <NodeLibrary
                    metricCategories={metricCategories || []}
                    compositeLayerIdByMetricType={compositeLayerIdByMetricType}
                    selectedMetricTypeId={editedCompositeMetricTypeId}
                    searchTerm={nodeSearchTerm}
                />
            )}
        </CardStyled>
    );

    // Two-step spotlight when the account has no layers yet
    const hasNoLayers = useMemo(
        () =>
            !isLoadingMetricLayers &&
            Array.isArray(metricCategories) &&
            metricCategories.every(c => c.items.length === 0),
        [isLoadingMetricLayers, metricCategories],
    );

    const onboardingSteps = useMemo(
        () => [
            {
                title: formatMessage(MESSAGES.onboardingStep1Title),
                description: formatMessage(MESSAGES.onboardingStep1Description),
                shape: 'circle' as const,
            },
            {
                title: formatMessage(MESSAGES.onboardingStep2Title),
                description: formatMessage(MESSAGES.onboardingStep2Description),
                shape: 'circle' as const,
            },
        ],
        [formatMessage],
    );

    const onboarding = useOnboarding({
        id: 'dataLayers.intro',
        enabled: hasNoLayers,
        documentation: {
            href: formatMessage(MESSAGES.onboardingDocumentationUrl),
        },
        steps: onboardingSteps,
    });

    const layerListCard = (
        <Card sx={styles.card}>
            <CardStyled
                header={
                    <DataLayerListHeader
                        onCreate={wizard.open}
                        createActionRef={onboarding.anchorRefs[0]}
                        moreActionsRef={onboarding.anchorRefs[1]}
                    />
                }
            >
                <DataLayerList
                    metricCategories={metricCategories || []}
                    onSelectMetricType={setDisplayedMetricType}
                    selectedMetricTypeId={displayedMetricType?.id}
                    onEditMetricType={onEditMetricType}
                    compositeLayerIdByMetricType={compositeLayerIdByMetricType}
                    deleteMetricType={deleteMetricType}
                    onRefreshOpenHexaLayer={refreshOpenHexaLayer}
                    openHexaImportStatus={openHexaImportStatus}
                />
            </CardStyled>
        </Card>
    );

    const renderSidebarColumn = () => {
        if (isCompositeEditorOpen) {
            return <Card sx={styles.card}>{compositeSidebar}</Card>;
        }
        if (wizard.isOpen) {
            return (
                <DataLayerWizardPanel
                    controller={wizard}
                    showOpenHexa={showOpenHexaLayers}
                    showComposite={showCompositeLayers}
                    orgUnits={orgUnits || []}
                    compositeGraphSlot={
                        wizard.isCompositeGraphStep
                            ? compositeSidebar
                            : undefined
                    }
                    onCompositeNext={handleCompositeNext}
                />
            );
        }
        return layerListCard;
    };

    const mapColumn = (
        <Stack direction="row" gap={1} sx={{ height: '100%' }}>
            <DataLayerMapWrapper
                metricType={displayedMetricType}
                orgUnits={orgUnits || []}
                showCompositeLayers={showCompositeLayers}
                compositeLayerId={
                    displayedMetricType
                        ? compositeLayerIdByMetricType.get(
                              displayedMetricType.id,
                          )
                        : undefined
                }
                onEditComposite={onEditCompositeLayer}
            />
            <DataLayerComparisonContainer />
        </Stack>
    );

    const editorProps = wizard.isCompositeGraphStep
        ? {
              onClose: wizard.requestClose,
              onSaved: onWizardGraphSaved,
              hideActions: true,
              onToggleSidebar: undefined,
          }
        : {
              onClose: onCloseCompositeEditor,
              onSaved: onCompositeSaved,
              hideActions: false,
              onToggleSidebar: toggleSidebar,
          };

    const renderMainColumn = () => {
        if (isCompositeEditorActive && activeCompositeLayerId) {
            return (
                <CompositeLayerEditor
                    ref={compositeLayerEditorRef}
                    compositeLayerId={activeCompositeLayerId}
                    sidebarCollapsed={sidebarCollapsed}
                    {...editorProps}
                />
            );
        }
        if (!wizard.isOpen) return mapColumn;
        switch (wizard.wizardMainView) {
            case 'standardData':
                return (
                    <DataLayerWizardMain
                        controller={wizard}
                        orgUnits={orgUnits || []}
                    />
                );
            case 'legendPreview':
                return (
                    <WizardLegendPreview
                        controller={wizard}
                        orgUnits={orgUnits || []}
                    />
                );
            case 'intro':
                return <WizardPreviewPlaceholder />;
            default:
                // 'compositeGraph' before the shell exists — show the map briefly.
                return mapColumn;
        }
    };

    return (
        <DataLayerComparisonProvider orgUnits={orgUnits ?? []}>
            {isLoadingMetricLayers && <LoadingSpinner />}
            <TopBar
                title={formatMessage(MESSAGES.dataLayersTitle)}
                disableShadow
                sx={{ zIndex: 401 }}
            />
            <PageContainer>
                <SidebarLayout>
                    {!sidebarCollapsed && (
                        <SidebarColumn>
                            <PaperFullHeight>
                                {renderSidebarColumn()}
                            </PaperFullHeight>
                        </SidebarColumn>
                    )}
                    <MainColumn>
                        <PaperFullHeight>{renderMainColumn()}</PaperFullHeight>
                    </MainColumn>
                </SidebarLayout>
                {isMetricTypeFormOpen && (
                    <DataLayerDialog
                        open={isMetricTypeFormOpen}
                        closeDialog={onDialogClose}
                        metricType={selectedMetricType}
                        categoryOptions={existingCategoryOptions}
                        showCompositeLayers={showCompositeLayers}
                        showOpenHexaLayers={showOpenHexaLayers}
                        compositeLayer={
                            selectedMetricType
                                ? compositeLayerByMetricType.get(
                                      selectedMetricType.id,
                                  )
                                : undefined
                        }
                        onCompositeCreated={onCompositeCreated}
                    />
                )}
                <DiscardWizardModal
                    open={wizard.discardOpen}
                    isComposite={wizard.layerType === 'composite'}
                    onConfirm={wizard.confirmDiscard}
                    onCancel={wizard.cancelDiscard}
                />
            </PageContainer>
            {onboarding.element}
        </DataLayerComparisonProvider>
    );
};
