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
import { GeneratedGraph } from '../compositeLayerEditor/compositeLayerChatBot/types';
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
import { useDeleteMetricType } from './hooks/useDeleteMetricType';
import { useGetMetricCategories } from './hooks/useGetMetrics';
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
    const {
        messages: aiChatMessages,
        isLoading: isAiChatLoading,
        sendMessage: sendAiChatMessage,
        reset: resetAiChat,
    } = useCompositeLayerAIChat({
        getCurrentGraph: getCurrentCompositeLayerGraph,
        onGenerate: onGenerateCompositeLayerGraph,
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

    // Keeps the edited composite selected in the list while the editor is open.
    const editedCompositeMetricTypeId = useMemo(
        () =>
            (compositeLayers ?? []).find(
                layer => layer.id === editingCompositeLayerId,
            )?.metric_type ?? undefined,
        [compositeLayers, editingCompositeLayerId],
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

    const onCreateMetricType = useCallback(() => {
        setSelectedMetricType(undefined);
        setIsMetricTypeFormOpen(true);
    }, [setSelectedMetricType, setIsMetricTypeFormOpen]);

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
                                {isCompositeEditorOpen ? (
                                    <Card sx={styles.card}>
                                        <CardStyled
                                            flushContent={isAiChatTab}
                                            header={
                                                <>
                                                    <CompositeSidebarTabs
                                                        tab={sidebarTab}
                                                        onChangeTab={
                                                            setSidebarTab
                                                        }
                                                        showTabs={hasAiApiKey}
                                                    />
                                                    {!isAiChatTab && (
                                                        <NodeLibrarySearch
                                                            value={
                                                                nodeSearchTerm
                                                            }
                                                            onChange={
                                                                setNodeSearchTerm
                                                            }
                                                        />
                                                    )}
                                                </>
                                            }
                                        >
                                            {isAiChatTab ? (
                                                <CompositeLayerAIChat
                                                    messages={aiChatMessages}
                                                    isLoading={isAiChatLoading}
                                                    onSendMessage={
                                                        sendAiChatMessage
                                                    }
                                                />
                                            ) : (
                                                <NodeLibrary
                                                    metricCategories={
                                                        metricCategories || []
                                                    }
                                                    compositeLayerIdByMetricType={
                                                        compositeLayerIdByMetricType
                                                    }
                                                    selectedMetricTypeId={
                                                        editedCompositeMetricTypeId
                                                    }
                                                    searchTerm={nodeSearchTerm}
                                                />
                                            )}
                                        </CardStyled>
                                    </Card>
                                ) : (
                                    <Card sx={styles.card}>
                                        <CardStyled
                                            header={
                                                <DataLayerListHeader
                                                    onCreate={
                                                        onCreateMetricType
                                                    }
                                                    createActionRef={
                                                        onboarding.anchorRefs[0]
                                                    }
                                                    moreActionsRef={
                                                        onboarding.anchorRefs[1]
                                                    }
                                                />
                                            }
                                        >
                                            <DataLayerList
                                                metricCategories={
                                                    metricCategories || []
                                                }
                                                onSelectMetricType={
                                                    setDisplayedMetricType
                                                }
                                                selectedMetricTypeId={
                                                    displayedMetricType?.id
                                                }
                                                onEditMetricType={
                                                    onEditMetricType
                                                }
                                                compositeLayerIdByMetricType={
                                                    compositeLayerIdByMetricType
                                                }
                                                deleteMetricType={
                                                    deleteMetricType
                                                }
                                            />
                                        </CardStyled>
                                    </Card>
                                )}
                            </PaperFullHeight>
                        </SidebarColumn>
                    )}
                    <MainColumn>
                        <PaperFullHeight>
                            {isCompositeEditorOpen &&
                            editingCompositeLayerId ? (
                                <CompositeLayerEditor
                                    ref={compositeLayerEditorRef}
                                    compositeLayerId={editingCompositeLayerId}
                                    onClose={onCloseCompositeEditor}
                                    onSaved={onCompositeSaved}
                                    sidebarCollapsed={sidebarCollapsed}
                                    onToggleSidebar={toggleSidebar}
                                />
                            ) : (
                                <Stack
                                    direction="row"
                                    gap={1}
                                    sx={{ height: '100%' }}
                                >
                                    <DataLayerMapWrapper
                                        metricType={displayedMetricType}
                                        orgUnits={orgUnits || []}
                                        showCompositeLayers={
                                            showCompositeLayers
                                        }
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
                            )}
                        </PaperFullHeight>
                    </MainColumn>
                </SidebarLayout>
                {isMetricTypeFormOpen && (
                    <DataLayerDialog
                        open={isMetricTypeFormOpen}
                        closeDialog={onDialogClose}
                        metricType={selectedMetricType}
                        categoryOptions={existingCategoryOptions}
                        showCompositeLayers={showCompositeLayers}
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
            </PageContainer>
            {onboarding.element}
        </DataLayerComparisonProvider>
    );
};
