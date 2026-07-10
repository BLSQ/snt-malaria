import React, { FC, useCallback, useMemo, useRef, useState } from 'react';
import { Card, Stack } from '@mui/material';
import { LoadingSpinner, useSafeIntl } from 'bluesquare-components';
import TopBar from 'Iaso/components/nav/TopBarComponent';
import { userHasPermission } from 'Iaso/domains/users/utils';
import { useParamsObject } from 'Iaso/routing/hooks/useParamsObject';

import { SxStyles } from 'Iaso/types/general';
import { hasFeatureFlag, SHOW_DEV_FEATURES } from 'Iaso/utils/featureFlags';
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
import { useGetCompositeLayers } from '../compositeLayerEditor/hooks/useGetCompositeLayers';
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
    // Composite layers are still in development and only exposed on dev-features accounts,
    // to users with the settings write permission (mirrors the API permission).
    const currentUser = useCurrentUser();
    const showCompositeLayers =
        hasFeatureFlag(currentUser, SHOW_DEV_FEATURES) &&
        userHasPermission(SETTINGS_WRITE, currentUser);

    const [displayedMetricType, setDisplayedMetricType] =
        useState<MetricType>();
    const { data: accountSettings } = useGetAccountSettings();
    const interventionTypeId = accountSettings?.intervention_org_unit_type_id;
    const { data: orgUnits } = useGetOrgUnits({
        orgUnitParentId: displayOrgUnitId,
        orgUnitTypeId: interventionTypeId,
        enabled: !!interventionTypeId,
    });

    const { data: metricCategories, isLoading: isLoadingMetricLayers } =
        useGetMetricCategories();
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

    const { data: compositeLayers } =
        useGetCompositeLayers(showCompositeLayers);
    const compositeLayerIdByMetricType = useMemo(() => {
        const map = new Map<number, number>();
        (compositeLayers ?? []).forEach(layer => {
            if (layer.metric_type) {
                map.set(layer.metric_type, layer.id);
            }
        });
        return map;
    }, [compositeLayers]);

    // MetricType of the composite currently being edited, so the list can keep it selected while
    // the editor is open (undefined for a brand-new composite that has no resulting layer yet).
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

    const onCreateCompositeLayer = useCallback(() => {
        setEditingCompositeLayerId(undefined);
        setIsCompositeEditorOpen(true);
    }, []);

    // Editing a composite's graph is a dedicated action, distinct from editing its legend.
    const onEditCompositeLayer = useCallback((compositeLayerId: number) => {
        setEditingCompositeLayerId(compositeLayerId);
        setIsCompositeEditorOpen(true);
    }, []);

    const onCloseCompositeEditor = useCallback(() => {
        setIsCompositeEditorOpen(false);
        setEditingCompositeLayerId(undefined);
        setSidebarCollapsed(false);
    }, []);

    // After saving, close the editor and show the resulting composite layer on the map.
    const onCompositeSaved = useCallback((metricType?: MetricType) => {
        setIsCompositeEditorOpen(false);
        setEditingCompositeLayerId(undefined);
        setSidebarCollapsed(false);
        if (metricType) {
            setDisplayedMetricType(metricType);
        }
    }, []);

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
                                    <CompositeLayerAIChat
                                        onGenerate={
                                            onGenerateCompositeLayerGraph
                                        }
                                    />
                                ) : (
                                    <Card sx={styles.card}>
                                        <CardStyled
                                            header={
                                                <DataLayerListHeader
                                                    onCreate={
                                                        onCreateMetricType
                                                    }
                                                    onCreateComposite={
                                                        onCreateCompositeLayer
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
                                                    isCompositeEditorOpen
                                                        ? editedCompositeMetricTypeId
                                                        : displayedMetricType?.id
                                                }
                                                onEditMetricType={
                                                    onEditMetricType
                                                }
                                                onEditCompositeLayer={
                                                    onEditCompositeLayer
                                                }
                                                compositeLayerIdByMetricType={
                                                    compositeLayerIdByMetricType
                                                }
                                                deleteMetricType={
                                                    deleteMetricType
                                                }
                                                editing={isCompositeEditorOpen}
                                            />
                                        </CardStyled>
                                    </Card>
                                )}
                            </PaperFullHeight>
                        </SidebarColumn>
                    )}
                    <MainColumn>
                        <PaperFullHeight>
                            {isCompositeEditorOpen ? (
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
                    />
                )}
            </PageContainer>
            {onboarding.element}
        </DataLayerComparisonProvider>
    );
};
