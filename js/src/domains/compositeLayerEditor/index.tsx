import React, {
    FC,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    Box,
    Card,
    GlobalStyles,
    Theme,
    Typography,
    useTheme,
} from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { NodeEditor, FlumeCommentMap } from 'flume';
import { SxStyles } from 'Iaso/types/general';
import { CardStyled } from '../../components/CardStyled';
import { useGetMetricCategories } from '../dataLayers/hooks/useGetMetrics';
import { MetricType } from '../dataLayers/types/metrics';
import { useGetAccountSettings } from '../planning/hooks/useGetAccountSettings';
import { useGetOrgUnits } from '../planning/hooks/useGetOrgUnits';
import { CanvasControls } from './components/CanvasControls';
import { EditorHeader } from './components/EditorHeader';
import { NodeHeaderContent } from './components/NodeHeaderContent';
import {
    CompositeEditorContext,
    createCompositeFlumeConfig,
    MetricOption,
} from './flumeConfig';
import { flumeContextMenuStyles, flumeThemeSx } from './flumeTheme';
import { useCanvasDrop } from './hooks/useCanvasDrop';
import { useCompositePreview } from './hooks/useCompositePreview';
import { useGetCompositeLayer } from './hooks/useGetCompositeLayers';
import { usePortConnectionSync } from './hooks/usePortConnectionSync';
import { useSaveCompositeLayer } from './hooks/useSaveCompositeLayer';
import { MESSAGES } from './messages';
import { FlumeGraph } from './types/flumeGraph';
import { getConnectedDataLayerIds, isOutputConnected } from './utils/graph';

// Flume adds a default output node for a fresh graph; existing graphs already contain their own.
const DEFAULT_NODES = [{ type: 'output' }];

const styles = {
    card: {
        flexGrow: 1,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
    },
    canvas: {
        position: 'relative',
        height: '100%',
        minHeight: 0,
        // Match the corner radius used by the SNT maps.
        borderRadius: (theme: Theme) => `${theme.shape.borderRadius * 2}px`,
        border: (theme: Theme) => `1px solid ${theme.palette.divider}`,
        overflow: 'hidden',
    },
    helper: {
        position: 'absolute',
        bottom: 8,
        left: 12,
        // Leave room for the zoom/reset controls anchored bottom-right.
        right: 56,
        color: 'text.secondary',
        pointerEvents: 'none',
        zIndex: 1,
    },
} satisfies SxStyles;

type Props = {
    onClose: () => void;
    /** Called after a successful save with the resulting layer, so it can be shown on the map. */
    onSaved?: (metricType?: MetricType) => void;
    /** When set, the editor loads and updates this existing composite layer. */
    compositeLayerId?: number;
    /** Whether the data layers sidebar is currently collapsed (owned by the parent page). */
    sidebarCollapsed?: boolean;
    /** Toggles the data layers sidebar (mirrors the scenario editor's rules-panel toggle). */
    onToggleSidebar?: () => void;
};

export const CompositeLayerEditor: FC<Props> = ({
    onClose,
    onSaved,
    compositeLayerId,
    sidebarCollapsed = false,
    onToggleSidebar,
}) => {
    const { formatMessage } = useSafeIntl();
    const theme = useTheme();

    const { data: metricCategories, isLoading: isLoadingMetrics } =
        useGetMetricCategories();
    const { data: existingLayer, isLoading: isLoadingLayer } =
        useGetCompositeLayer(compositeLayerId);
    const { mutate: saveCompositeLayer, isLoading: isSaving } =
        useSaveCompositeLayer();

    const nodesRef = useRef<FlumeGraph>({});
    const commentsRef = useRef<FlumeCommentMap>({});
    const canvasRef = useRef<HTMLDivElement>(null);
    const { preview, runPreview, schedulePreview, markDisconnected } =
        useCompositePreview();
    // Flume reads `nodes`/`comments`/`initialScale` only at mount, so dropping a data layer onto
    // the canvas remounts the editor (bumping `mountNonce`) with the mutated graph. The mount refs
    // carry the graph + scale to restore on that remount so the view stays put.
    const {
        mountNonce,
        mountGraphRef,
        mountCommentsRef,
        mountScaleRef,
        handleCanvasDrop,
    } = useCanvasDrop({ canvasRef, nodesRef, commentsRef });
    // Data layers wired into the output (even behind transformations), ordered; drives the
    // "based on a data layer" legend picker ordering.
    const [connectedLayerIds, setConnectedLayerIds] = useState<number[]>([]);

    const metricOptions: MetricOption[] = useMemo(() => {
        if (!metricCategories) return [];
        return metricCategories.flatMap(category =>
            category.items.map(item => ({
                value: item.id,
                label: item.name,
            })),
        );
    }, [metricCategories]);

    const config = useMemo(
        () => createCompositeFlumeConfig(metricOptions, formatMessage),
        [metricOptions, formatMessage],
    );

    // Org units + metric metadata needed by the in-node map preview, handed to Flume controls
    // through the NodeEditor `context` prop.
    const { data: accountSettings } = useGetAccountSettings();
    const interventionTypeId = accountSettings?.intervention_org_unit_type_id;
    const { data: orgUnits } = useGetOrgUnits({
        orgUnitTypeId: interventionTypeId,
        enabled: !!interventionTypeId,
    });

    const editorContext: CompositeEditorContext = useMemo(() => {
        const metricTypeById = new Map<number, MetricType>();
        (metricCategories ?? []).forEach(category => {
            category.items.forEach(item => metricTypeById.set(item.id, item));
        });
        return {
            orgUnits: orgUnits ?? [],
            metricTypeById,
            preview,
            connectedLayerIds,
        };
    }, [metricCategories, orgUnits, preview, connectedLayerIds]);

    // Seed the working graph + comments from the loaded layer (NodeEditor only reads these at mount).
    useEffect(() => {
        if (existingLayer?.graph) {
            nodesRef.current = existingLayer.graph;
        }
        if (existingLayer?.comments) {
            commentsRef.current = existingLayer.comments;
        }
    }, [existingLayer]);

    const isReady = !isLoadingMetrics && (!compositeLayerId || !isLoadingLayer);

    const syncPortConnections = usePortConnectionSync(canvasRef);

    const handleChange = (nodes: FlumeGraph) => {
        nodesRef.current = nodes;
        // Wait a frame so ports added/removed by this change are in the DOM before we tag them.
        requestAnimationFrame(() => syncPortConnections(nodes));
        setConnectedLayerIds(getConnectedDataLayerIds(nodes));
        // Clear the preview immediately on disconnect (don't wait out the debounce on a stale map).
        if (!isOutputConnected(nodes)) {
            markDisconnected();
            return;
        }
        schedulePreview(nodes);
    };

    // Initial paint: existing graphs don't emit an onChange, so tag their ports once mounted.
    useEffect(() => {
        if (!isReady) return undefined;
        const frame = requestAnimationFrame(() =>
            syncPortConnections(nodesRef.current),
        );
        return () => cancelAnimationFrame(frame);
    }, [isReady, existingLayer, syncPortConnections]);

    // Kick off a first preview once loaded (existing graphs don't emit an initial onChange).
    useEffect(() => {
        if (!isReady) return;
        setConnectedLayerIds(getConnectedDataLayerIds(nodesRef.current));
        runPreview(nodesRef.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isReady, existingLayer]);

    const handleCommentsChange = (comments: FlumeCommentMap) => {
        commentsRef.current = comments;
    };

    // After a drop-triggered remount, refresh the derived state the way an `onChange` normally would
    // (the fresh NodeEditor doesn't emit one at mount).
    useEffect(() => {
        if (mountNonce === 0 || !isReady) return undefined;
        const frame = requestAnimationFrame(() =>
            syncPortConnections(nodesRef.current),
        );
        setConnectedLayerIds(getConnectedDataLayerIds(nodesRef.current));
        runPreview(nodesRef.current);
        return () => cancelAnimationFrame(frame);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mountNonce]);

    // Prefix every node's header with an icon and, for deletable nodes, a delete button.
    const renderNodeHeader = useCallback(
        (Wrapper: any, nodeType: any, actions: any) => (
            <Wrapper>
                <NodeHeaderContent nodeType={nodeType} actions={actions} />
            </Wrapper>
        ),
        [],
    );

    const handleSave = () => {
        saveCompositeLayer(
            {
                graph: nodesRef.current,
                comments: commentsRef.current,
                id: compositeLayerId,
            },
            {
                onSuccess: saved => {
                    // Hand the resulting layer to the parent so it can be displayed on the map;
                    // fall back to just closing if no handler is provided.
                    if (onSaved) {
                        onSaved(saved?.metric_type_detail ?? undefined);
                    } else {
                        onClose();
                    }
                },
            },
        );
    };

    // Main-panel title: the edited layer's name, or "New composite layer" for a fresh one.
    const headerTitle = compositeLayerId
        ? existingLayer?.name || formatMessage(MESSAGES.title)
        : formatMessage(MESSAGES.newCompositeLayer);

    return (
        <Card sx={styles.card}>
            <GlobalStyles styles={flumeContextMenuStyles(theme)} />
            <CardStyled
                isLoading={!isReady}
                header={
                    <EditorHeader
                        title={headerTitle}
                        sidebarCollapsed={sidebarCollapsed}
                        onToggleSidebar={onToggleSidebar}
                        onCancel={onClose}
                        onSave={handleSave}
                        isSaving={isSaving}
                    />
                }
            >
                <Box
                    ref={canvasRef}
                    sx={[styles.canvas, flumeThemeSx]}
                    onDragOver={event => {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = 'copy';
                    }}
                    onDrop={handleCanvasDrop}
                >
                    <NodeEditor
                        key={`${compositeLayerId ?? 'new'}-${mountNonce}`}
                        portTypes={config.portTypes}
                        nodeTypes={config.nodeTypes}
                        nodes={
                            mountNonce === 0
                                ? existingLayer?.graph
                                : mountGraphRef.current
                        }
                        comments={
                            mountNonce === 0
                                ? existingLayer?.comments
                                : mountCommentsRef.current
                        }
                        initialScale={
                            mountNonce === 0 ? undefined : mountScaleRef.current
                        }
                        defaultNodes={DEFAULT_NODES}
                        context={editorContext}
                        onChange={handleChange}
                        onCommentsChange={handleCommentsChange}
                        renderNodeHeader={renderNodeHeader}
                    />
                    <CanvasControls
                        canvasRef={canvasRef}
                        initialFitAlign={compositeLayerId ? 'center' : 'right'}
                    />
                    <Typography variant="caption" sx={styles.helper}>
                        {formatMessage(MESSAGES.helper)}
                    </Typography>
                </Box>
            </CardStyled>
        </Card>
    );
};
