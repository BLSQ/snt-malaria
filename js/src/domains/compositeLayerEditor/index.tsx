import React, {
    useCallback,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
    forwardRef,
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
import { NodeEditor, FlumeCommentMap, FlumeNodes } from 'flume';
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
    buildFlumeGraphFromSpec,
    centerGraph,
    relayoutWithMeasuredSizes,
} from './compositeLayerChatBot/buildFlumeGraph';
import { extractGraphSpecFromFlume } from './compositeLayerChatBot/extractGraphSpec';
import { CurrentGraph, GeneratedGraph } from './compositeLayerChatBot/types';
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
import {
    computeFitScale,
    getStageElement,
    measureNodeSizes,
    shiftGraphForRemount,
} from './utils/flumeStage';
import { getConnectedDataLayerIds, isOutputConnected } from './utils/graph';

// Flume adds a default output node for a fresh graph; existing graphs already contain their own.
const DEFAULT_NODES = [{ type: 'output' }];

// A response is "content-only" (parameter changes on nodes already on the canvas, e.g. a formula
// tweak) when it produces exactly the same node ids as before - including the always-present
// `output` node. Anything else (a node added or removed, including the very first generation) is
// "structural". This drives whether positions are kept as-is or fully re-laid-out - see
// `handleGenerateGraph`.
const hasSameNodeIds = (previousNodes: FlumeGraph, graph: GeneratedGraph): boolean => {
    const previousIds = new Set(Object.keys(previousNodes));
    const nextIds = new Set([...graph.nodes.map(node => node.id), 'output']);
    if (previousIds.size !== nextIds.size) return false;
    return [...nextIds].every(id => previousIds.has(id));
};

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
    /** Whether the sidebar is currently showing the AI chat rather than the draggable data layer
     * list (owned by the parent page, which renders both). Passed straight through to the header. */
    isAiChatMode?: boolean;
    onToggleAiChatMode?: () => void;
    /** Shows the AI chat toggle in the header - only when the account has an AI API key
     * configured. */
    showAiChatToggle?: boolean;
};

// Imperative handle so a sibling AI chat panel (rendered by the parent, outside this component's
// tree) can push a generated graph in - see `applyGeneratedGraph` below for why this can't just be
// a prop passed down.
export type CompositeLayerEditorHandle = {
    applyGeneratedGraph: (graph: GeneratedGraph) => void;
    /** Spec of the graph currently on the canvas, sent to the AI as context (null when empty). */
    getCurrentGraph: () => CurrentGraph | null;
};

export const CompositeLayerEditor = forwardRef<
    CompositeLayerEditorHandle,
    Props
>(
    (
        {
            onClose,
            onSaved,
            compositeLayerId,
            sidebarCollapsed = false,
            onToggleSidebar,
            isAiChatMode = false,
            onToggleAiChatMode,
            showAiChatToggle = false,
        },
        ref,
    ) => {
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
        const previewTimer = useRef<ReturnType<typeof setTimeout>>();
        const { preview, runPreview, schedulePreview, markDisconnected } =
            useCompositePreview();

        // An AI-generated graph, applied to the canvas by remounting NodeEditor (it only reads
        // `nodes`/`comments` at mount time, so there's no other way to push a new graph in).
        const [aiGraph, setAiGraph] = useState<FlumeNodes | undefined>();
        const [aiComments, setAiComments] = useState<
            FlumeCommentMap | undefined
        >();

        // Flume reads `nodes`/`comments`/`initialScale` only at mount, so dropping a data layer onto
        // the canvas remounts the editor (bumping `mountNonce`) with the mutated graph. The mount refs
        // carry the graph + scale to restore on that remount so the view stays put.
        const {
            mountNonce,
            mountGraphRef,
            mountCommentsRef,
            mountScaleRef,
            handleCanvasDrop,
        } = useCanvasDrop({
            canvasRef,
            nodesRef,
            commentsRef,
            onBeforeRemount: () => {
                setAiGraph(undefined);
                setAiComments(undefined);
            },
        });

        // Data layers wired into the output (even behind transformations), ordered; drives the
        // "based on a data layer" legend picker ordering.
        const [connectedLayerIds, setConnectedLayerIds] = useState<number[]>(
            [],
        );
        const [editorGeneration, setEditorGeneration] = useState(0);
        // Framing for a graph update (see handleGenerateGraph/handleRearrange and the
        // measure-and-correct effect below): a "structural" change (nodes added/removed) has no
        // real DOM sizes yet, so it mounts once, hidden, with size *estimates* - both of these
        // true - then a follow-up effect measures the real sizes, centers/scales the result
        // (`centerGraph`/`computeFitScale`), and remounts again already framed and visible. A
        // content-only change or a rearrange has real sizes already and goes straight to that
        // second step, so it never sets these true in the first place.
        const viewResetPendingRef = useRef(false); // skip restoring mountScaleRef on this mount
        const [isFraming, setIsFraming] = useState(false); // hide the canvas while true

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
        const interventionTypeId =
            accountSettings?.intervention_org_unit_type_id;
        const { data: orgUnits } = useGetOrgUnits({
            orgUnitTypeId: interventionTypeId,
            enabled: !!interventionTypeId,
        });

        const editorContext: CompositeEditorContext = useMemo(() => {
            const metricTypeById = new Map<number, MetricType>();
            (metricCategories ?? []).forEach(category => {
                category.items.forEach(item =>
                    metricTypeById.set(item.id, item),
                );
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

        const isReady =
            !isLoadingMetrics && (!compositeLayerId || !isLoadingLayer);

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
        // Also re-runs after an AI-generated graph forces a remount (`editorGeneration`).
        useEffect(() => {
            if (!isReady) return undefined;
            const frame = requestAnimationFrame(() =>
                syncPortConnections(nodesRef.current),
            );
            return () => cancelAnimationFrame(frame);
        }, [isReady, existingLayer, editorGeneration, syncPortConnections]);

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

        // Applies an AI-generated graph to the canvas. NodeEditor only reads `nodes`/`comments` at
        // mount time, so `editorGeneration` forces a remount (see the `key` below) with the new
        // graph. Two cases, matching `hasSameNodeIds`:
        // - Content-only (same node ids as before): every node keeps its exact position - shift it
        //   by the current pan first (`shiftGraphForRemount`) so the forced remount doesn't visibly
        //   jump once Flume resets its own pan/zoom, and restore the same scale afterwards. Also
        //   cancels any structural update still mid-flight (see `isFraming` above), so its
        //   correction effect can't clobber these positions once it eventually fires.
        // - Structural (nodes added/removed, including the very first generation): hides the
        //   canvas and hands off to the measure-and-correct effect below.
        const handleGenerateGraph = useCallback(
            (graph: GeneratedGraph) => {
                let nodes: FlumeNodes;
                let comments: FlumeCommentMap;

                if (hasSameNodeIds(nodesRef.current, graph)) {
                    const shifted = shiftGraphForRemount(
                        nodesRef.current,
                        commentsRef.current,
                        canvasRef.current,
                    );
                    nodes = buildFlumeGraphFromSpec(graph, shifted.nodes);
                    comments = shifted.comments;
                    mountScaleRef.current = shifted.scale;
                    viewResetPendingRef.current = false;
                    setIsFraming(false);
                } else {
                    nodes = buildFlumeGraphFromSpec(graph);
                    comments = {};
                    viewResetPendingRef.current = true;
                    setIsFraming(true);
                }

                nodesRef.current = nodes;
                commentsRef.current = comments;
                setAiGraph(nodes);
                setAiComments(comments);
                setEditorGeneration(generation => generation + 1);
                setConnectedLayerIds(getConnectedDataLayerIds(nodes));
                if (previewTimer.current) clearTimeout(previewTimer.current);
                if (isOutputConnected(nodes)) {
                    runPreview(nodes);
                } else {
                    markDisconnected();
                }
            },
            [runPreview, markDisconnected, mountScaleRef],
        );

        // Follow-up to a structural update's hidden estimate mount (see `isFraming` above):
        // measure every node's real rendered size, re-lay-out with `relayoutWithMeasuredSizes`,
        // center/scale the result, then remount once more already framed. Guarded by `isFraming`
        // itself, so a newer update that turns it back off (content-only, or a rearrange) cancels
        // this before it can overwrite that update's positions.
        useEffect(() => {
            if (!isFraming || !isReady) return undefined;
            let frame = 0;
            let attempts = 0;
            const expectedCount = Object.keys(nodesRef.current).length;
            const tick = () => {
                const stage = getStageElement(canvasRef.current);
                const measuredSizes = stage
                    ? measureNodeSizes(stage)
                    : new Map();
                if (stage && measuredSizes.size >= expectedCount) {
                    const { nodes: relaid, boundingBox } =
                        relayoutWithMeasuredSizes(
                            nodesRef.current,
                            measuredSizes,
                        );
                    const centered = centerGraph(relaid, boundingBox);
                    const canvasRect =
                        canvasRef.current?.getBoundingClientRect();
                    mountScaleRef.current = canvasRect
                        ? computeFitScale(
                              boundingBox.maxX - boundingBox.minX,
                              boundingBox.maxY - boundingBox.minY,
                              canvasRect.width,
                              canvasRect.height,
                          )
                        : 1;
                    viewResetPendingRef.current = false;

                    nodesRef.current = centered;
                    setAiGraph(centered);
                    setIsFraming(false);
                    setEditorGeneration(generation => generation + 1);
                } else if (attempts < 30) {
                    attempts += 1;
                    frame = requestAnimationFrame(tick);
                } else {
                    // Gave up waiting for nodes to render - reveal the estimate-based layout as-is
                    // rather than leaving the canvas hidden forever.
                    setIsFraming(false);
                }
            };
            frame = requestAnimationFrame(tick);
            return () => cancelAnimationFrame(frame);
        }, [editorGeneration, isReady, isFraming, mountScaleRef]);

        // User-triggered re-arrange (top bar button): same measure-and-correct flow as above, but
        // in one step - the nodes are already mounted with real sizes, so there's no estimate pass
        // to correct afterwards.
        const handleRearrange = useCallback(() => {
            const stage = getStageElement(canvasRef.current);
            const canvasRect = canvasRef.current?.getBoundingClientRect();
            if (!stage || !canvasRect) return;
            const measuredSizes = measureNodeSizes(stage);

            const { nodes: relaid, boundingBox } = relayoutWithMeasuredSizes(
                nodesRef.current,
                measuredSizes,
            );
            const centered = centerGraph(relaid, boundingBox);

            nodesRef.current = centered;
            setAiGraph(centered);
            // Comments are independent annotations, not tied to any node - carried over as-is
            // rather than cleared, though their position is relative to the old layout.
            setAiComments(commentsRef.current);
            mountScaleRef.current = computeFitScale(
                boundingBox.maxX - boundingBox.minX,
                boundingBox.maxY - boundingBox.minY,
                canvasRect.width,
                canvasRect.height,
            );
            viewResetPendingRef.current = false;
            // Also cancels any AI structural update still mid-flight, same as the content-only
            // branch of handleGenerateGraph above.
            setIsFraming(false);
            setEditorGeneration(generation => generation + 1);
        }, [mountScaleRef]);

        useImperativeHandle(
            ref,
            () => ({
                applyGeneratedGraph: handleGenerateGraph,
                // nodesRef is kept current by handleChange on every edit, so this always reflects
                // the canvas - including hand-built graphs that never came from the AI.
                getCurrentGraph: () =>
                    extractGraphSpecFromFlume(nodesRef.current),
            }),
            [handleGenerateGraph],
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

        const nodes = useMemo(
            () =>
                aiGraph ??
                (mountNonce === 0
                    ? existingLayer?.graph
                    : mountGraphRef.current),
            [aiGraph, mountNonce, existingLayer, mountGraphRef],
        );

        const comments = useMemo(
            () =>
                aiGraph
                    ? aiComments
                    : mountNonce === 0
                      ? existingLayer?.comments
                      : mountCommentsRef.current,
            [aiGraph, aiComments, mountNonce, existingLayer, mountCommentsRef],
        );

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
                            isAiChatMode={isAiChatMode}
                            onToggleAiChatMode={onToggleAiChatMode}
                            showAiChatToggle={showAiChatToggle}
                            onRearrange={handleRearrange}
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
                        {/* Faded rather than unmounted while `isFraming` (see above), so its real
                            DOM sizes stay measurable. `height: 100%` matters: Flume's own root
                            fills its immediate parent via `height: 100%`, so this wrapper needs one
                            too or the whole canvas collapses to its content's natural height. */}
                        <Box
                            sx={{
                                height: '100%',
                                opacity: isFraming ? 0 : 1,
                                pointerEvents: isFraming ? 'none' : 'auto',
                                transition: isFraming
                                    ? 'none'
                                    : 'opacity 200ms ease-out',
                            }}
                        >
                            <NodeEditor
                                key={`${compositeLayerId ?? 'new'}-${mountNonce}-${editorGeneration}`}
                                portTypes={config.portTypes}
                                nodeTypes={config.nodeTypes}
                                nodes={nodes}
                                comments={comments}
                                initialScale={
                                    viewResetPendingRef.current
                                        ? undefined
                                        : mountScaleRef.current
                                }
                                defaultNodes={DEFAULT_NODES}
                                context={editorContext}
                                onChange={handleChange}
                                onCommentsChange={handleCommentsChange}
                                renderNodeHeader={renderNodeHeader}
                            />
                        </Box>
                        <CanvasControls canvasRef={canvasRef} />
                        <Typography variant="caption" sx={styles.helper}>
                            {formatMessage(MESSAGES.helper)}
                        </Typography>
                    </Box>
                </CardStyled>
            </Card>
        );
    },
);
CompositeLayerEditor.displayName = 'CompositeLayerEditor';
