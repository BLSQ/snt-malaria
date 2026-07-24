import dagre from 'dagre';
import { FlumeNodes } from 'flume';
import { FlumeGraph } from '../types/flumeGraph';
import { MeasuredSize } from '../utils/flumeStage';
import { GeneratedGraph, GeneratedGraphNode, GraphNodeType } from './types';

// Horizontal gap dagre leaves between ranks (columns), and vertical gap between nodes stacked in
// the same rank.
const DAGRE_RANK_SEP = 60;
const DAGRE_NODE_SEP = 24;

const NODE_WIDTH: Record<GraphNodeType | 'output', number> = {
    dataLayer: 330,
    formula: 260,
    combine: 260,
    normalize: 260,
    classify: 320,
    output: 330,
};

// Rough rendered height per node type, to size dagre's layout so rows don't overlap - not
// pixel-exact. `dataLayer`/`output` default to an EXPANDED map preview (flumeConfig.ts:
// `expanded: data?.expanded ?? true`), so their estimate includes the map. dagre's estimate pass
// is corrected against real DOM sizes afterwards (see `relayoutWithMeasuredSizes`).
const NODE_HEIGHT: Record<GraphNodeType | 'output', number> = {
    dataLayer: 360,
    formula: 150,
    combine: 140,
    normalize: 130,
    classify: 140,
    output: 410,
};

// Rows of a classify node's rules table each add roughly this much height on top of its base size
// (see MappingsControl.tsx: one grid row per rule, control height + row gap).
const CLASSIFY_RULE_HEIGHT = 34;

// formula/combine render one port row per connected input (the trailing empty drop slot is already
// folded into NODE_HEIGHT), so only connected inputs add height here.
const DYNAMIC_PORT_ROW_HEIGHT = 32;

const DYNAMIC_ROW_HEIGHT: Partial<Record<GraphNodeType, number>> = {
    classify: CLASSIFY_RULE_HEIGHT,
    formula: DYNAMIC_PORT_ROW_HEIGHT,
    combine: DYNAMIC_PORT_ROW_HEIGHT,
};

// How many "dynamic" elements (rule rows, connected input ports, ...) a node renders beyond its
// NODE_HEIGHT base - dataLayer/normalize/output have none, so this returns 0 for them.
const dynamicElementCount = (node: GeneratedGraphNode): number => {
    if (node.type === 'classify') return node.rules?.length ?? 0;
    if (node.type === 'formula' || node.type === 'combine')
        return node.inputs?.length ?? 0;
    return 0;
};

const estimateNodeHeight = (
    type: GraphNodeType | 'output',
    dynamicCount = 0,
): number =>
    NODE_HEIGHT[type] +
    dynamicCount * (DYNAMIC_ROW_HEIGHT[type as GraphNodeType] ?? 0);

// Port name a node's result is exposed under, keyed by node type - matches flumeConfig.ts.
const OUTPUT_PORT_NAME: Record<GraphNodeType, string> = {
    dataLayer: 'values',
    formula: 'result',
    combine: 'result',
    normalize: 'result',
    classify: 'result',
};

// Names given to a formula/combine node's value inputs, in order: a, b, c, … (see flumeConfig.ts).
const formulaInputName = (index: number): string =>
    String.fromCharCode('a'.charCodeAt(0) + index);

const upstreamIds = (node: GeneratedGraphNode): string[] => {
    if (node.type === 'formula' || node.type === 'combine')
        return node.inputs ?? [];
    if (node.type === 'classify' || node.type === 'normalize')
        return node.input ? [node.input] : [];
    return [];
};

const addConnection = (
    nodes: FlumeNodes,
    from: { nodeId: string; portName: string },
    to: { nodeId: string; portName: string },
) => {
    const targetInputs = nodes[to.nodeId].connections.inputs;
    targetInputs[to.portName] = [
        ...(targetInputs[to.portName] ?? []),
        { nodeId: from.nodeId, portName: from.portName },
    ];
    const sourceOutputs = nodes[from.nodeId].connections.outputs;
    sourceOutputs[from.portName] = [
        ...(sourceOutputs[from.portName] ?? []),
        { nodeId: to.nodeId, portName: to.portName },
    ];
};

const OUTPUT_NODE_ID = 'output';

// All edges in the graph (including the output's own connection), as plain id pairs - the only
// shape dagre needs. Kept separate from `addConnection`'s port-level wiring below.
const collectEdges = (graph: GeneratedGraph): Array<{ from: string; to: string }> => {
    const edges: Array<{ from: string; to: string }> = [];
    graph.nodes.forEach(node => {
        upstreamIds(node).forEach(sourceId =>
            edges.push({ from: sourceId, to: node.id }),
        );
    });
    if (graph.output.source) {
        edges.push({ from: graph.output.source, to: OUTPUT_NODE_ID });
    }
    return edges;
};

type DagreNodeSpec = { id: string; width: number; height: number };
type DagreEdge = { from: string; to: string };
type DagreLayoutResult = { x: number; y: number; width: number; height: number };

/**
 * Lays out a set of nodes with dagre (layered "Sugiyama-style" left-to-right layout). Shared by
 * `layoutWithDagre` (size estimates) and `relayoutWithMeasuredSizes` (real DOM sizes); they differ
 * only in where node sizes and edges come from.
 */
const runDagreLayout = (
    nodeSpecs: DagreNodeSpec[],
    edges: DagreEdge[],
): Map<string, DagreLayoutResult> => {
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'LR', nodesep: DAGRE_NODE_SEP, ranksep: DAGRE_RANK_SEP });
    g.setDefaultEdgeLabel(() => ({}));

    nodeSpecs.forEach(({ id, width, height }) => {
        g.setNode(id, { width, height });
    });
    edges.forEach(({ from, to }) => {
        if (g.hasNode(from) && g.hasNode(to)) g.setEdge(from, to);
    });

    dagre.layout(g);

    const positions = new Map<string, DagreLayoutResult>();
    nodeSpecs.forEach(({ id, width, height }) => {
        // dagre positions a node by its center; the rest of this file positions by top-left.
        const { x, y } = g.node(id);
        positions.set(id, { x: x - width / 2, y: y - height / 2, width, height });
    });
    return positions;
};

// Lays out the whole graph (incl. the synthetic output) from size *estimates* - a structural
// update's first pass, before anything has rendered. See `buildFlumeGraphFromSpec`.
const layoutWithDagre = (
    graph: GeneratedGraph,
): Map<string, DagreLayoutResult> => {
    const nodeSpecs: DagreNodeSpec[] = graph.nodes.map(node => ({
        id: node.id,
        width: NODE_WIDTH[node.type],
        height: estimateNodeHeight(node.type, dynamicElementCount(node)),
    }));
    nodeSpecs.push({
        id: OUTPUT_NODE_ID,
        width: NODE_WIDTH.output,
        height: estimateNodeHeight('output'),
    });
    return runDagreLayout(nodeSpecs, collectEdges(graph));
};

// A graph's overall extent, in the same top-left coordinate space as `FlumeGraphNode.x`/`y`.
export type GraphBoundingBox = {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
};

export type RelayoutResult = {
    nodes: FlumeGraph;
    boundingBox: GraphBoundingBox;
};

// Edges from an already-wired FlumeGraph, read uniformly from each node's `connections.inputs`
// (unlike `collectEdges`, which reads the AI spec's per-type input/inputs/source fields).
const collectFlumeGraphEdges = (
    nodes: FlumeGraph,
): Array<{ from: string; to: string }> => {
    const edges: Array<{ from: string; to: string }> = [];
    Object.values(nodes).forEach(node => {
        Object.values(node.connections.inputs).forEach(connections => {
            connections.forEach(connection =>
                edges.push({ from: connection.nodeId, to: node.id }),
            );
        });
    });
    return edges;
};

/**
 * Re-lays-out an already-built graph from REAL measured node sizes rather than estimates, correcting
 * for content that only sizes itself once rendered (a wrapped layer name, a classify rules table).
 * Only positions change; data/connections pass through untouched. Also returns the bounding box so
 * the caller can frame it (see `centerGraph`) without re-measuring.
 */
export const relayoutWithMeasuredSizes = (
    nodes: FlumeGraph,
    measuredSizes: Map<string, MeasuredSize>,
): RelayoutResult => {
    const nodeSpecs: DagreNodeSpec[] = Object.values(nodes).map(node => {
        const measured = measuredSizes.get(node.id);
        return {
            id: node.id,
            width: measured?.width ?? node.width ?? NODE_WIDTH[node.type],
            height: measured?.height ?? NODE_HEIGHT[node.type],
        };
    });
    const positions = runDagreLayout(nodeSpecs, collectFlumeGraphEdges(nodes));

    const relaidNodes: FlumeGraph = {};
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    Object.entries(nodes).forEach(([id, node]) => {
        const position = positions.get(id);
        if (!position) return;
        relaidNodes[id] = { ...node, x: position.x, y: position.y };
        minX = Math.min(minX, position.x);
        minY = Math.min(minY, position.y);
        maxX = Math.max(maxX, position.x + position.width);
        maxY = Math.max(maxY, position.y + position.height);
    });

    return { nodes: relaidNodes, boundingBox: { minX, minY, maxX, maxY } };
};

/**
 * Shifts every node so the bounding box is centered on the stage origin (0,0). With Flume's default
 * `translate: 0` on a fresh mount, the box's center lands at the viewport center with no pan; paired
 * with `computeFitScale` as `initialScale`, the graph arrives pre-framed on its first paint.
 */
export const centerGraph = (
    nodes: FlumeGraph,
    boundingBox: GraphBoundingBox,
): FlumeGraph => {
    const shiftX = (boundingBox.minX + boundingBox.maxX) / 2;
    const shiftY = (boundingBox.minY + boundingBox.maxY) / 2;
    const centered: FlumeGraph = {};
    Object.entries(nodes).forEach(([id, node]) => {
        centered[id] = { ...node, x: node.x - shiftX, y: node.y - shiftY };
    });
    return centered;
};

/**
 * Converts the AI's abstract graph spec into a Flume-compatible node map matching the composite
 * layer editor's real node types (`dataLayer` / `formula` / `combine` / `normalize` / `classify` /
 * `output`, see flumeConfig.ts). Node ids from the spec are reused verbatim as Flume node ids.
 *
 * `previousNodes` controls positioning:
 * - The current canvas graph (content-only update): every node keeps its previous `x`/`y`.
 * - `{}` (default, structural update): every position is recomputed with dagre. This re-lays-out
 *   the whole graph, not just new nodes - simpler than pinning existing ones, at the cost of also
 *   moving any the user manually dragged, but only when the graph's shape actually changed.
 */
export const buildFlumeGraphFromSpec = (
    graph: GeneratedGraph,
    previousNodes: FlumeGraph = {},
): FlumeNodes => {
    const nodes: FlumeNodes = {};
    const isContentOnlyUpdate = Object.keys(previousNodes).length > 0;
    const dagrePositions = isContentOnlyUpdate ? undefined : layoutWithDagre(graph);

    const positionFor = (id: string): { x: number; y: number } =>
        (isContentOnlyUpdate ? previousNodes[id] : dagrePositions?.get(id)) ?? {
            x: 0,
            y: 0,
        };

    graph.nodes.forEach(node => {
        const { x, y } = positionFor(node.id);

        if (node.type === 'dataLayer') {
            nodes[node.id] = {
                id: node.id,
                type: 'dataLayer',
                width: NODE_WIDTH.dataLayer,
                x,
                y,
                inputData: {
                    // Must be a number: Flume's Select matches against numeric option values with
                    // `===` (see MetricOption in flumeConfig.ts).
                    metricType: {
                        metricTypeId: Number(node.metric_type_id),
                    },
                },
                connections: { inputs: {}, outputs: {} },
            };
        } else if (node.type === 'formula') {
            nodes[node.id] = {
                id: node.id,
                type: 'formula',
                width: NODE_WIDTH.formula,
                x,
                y,
                inputData: { formula: { formula: node.formula ?? '' } },
                connections: { inputs: {}, outputs: {} },
            };
        } else if (node.type === 'combine') {
            nodes[node.id] = {
                id: node.id,
                type: 'combine',
                width: NODE_WIDTH.combine,
                x,
                y,
                inputData: {
                    operation: { operation: node.operation ?? 'mean' },
                },
                connections: { inputs: {}, outputs: {} },
            };
        } else if (node.type === 'normalize') {
            nodes[node.id] = {
                id: node.id,
                type: 'normalize',
                width: NODE_WIDTH.normalize,
                x,
                y,
                // The scale control's options carry string values ('1'/'100'), see flumeConfig.ts.
                inputData: { scale: { scale: String(node.scale ?? 1) } },
                connections: { inputs: {}, outputs: {} },
            };
        } else if (node.type === 'classify') {
            nodes[node.id] = {
                id: node.id,
                type: 'classify',
                width: NODE_WIDTH.classify,
                x,
                y,
                inputData: {
                    config: {
                        rules: {
                            rules: (node.rules ?? []).map(rule => ({
                                op: rule.op,
                                value: rule.value,
                                label: rule.label,
                            })),
                            default: node.default ?? '',
                        },
                    },
                },
                connections: { inputs: {}, outputs: {} },
            };
        }
    });

    // Wire connections now that every node exists (so both endpoints can be updated together).
    graph.nodes.forEach(node => {
        if (node.type === 'formula' || node.type === 'combine') {
            (node.inputs ?? []).forEach((sourceId, index) => {
                const sourceType = nodes[sourceId]?.type as
                    | GraphNodeType
                    | undefined;
                if (!sourceType) return;
                addConnection(
                    nodes,
                    {
                        nodeId: sourceId,
                        portName: OUTPUT_PORT_NAME[sourceType],
                    },
                    { nodeId: node.id, portName: formulaInputName(index) },
                );
            });
        } else if (
            (node.type === 'classify' || node.type === 'normalize') &&
            node.input
        ) {
            const sourceType = nodes[node.input]?.type as
                | GraphNodeType
                | undefined;
            if (sourceType) {
                addConnection(
                    nodes,
                    {
                        nodeId: node.input,
                        portName: OUTPUT_PORT_NAME[sourceType],
                    },
                    { nodeId: node.id, portName: 'a' },
                );
            }
        }
    });

    // The output node: always exactly one.
    const { x: outputX, y: outputY } = positionFor(OUTPUT_NODE_ID);

    nodes[OUTPUT_NODE_ID] = {
        id: OUTPUT_NODE_ID,
        type: 'output',
        width: NODE_WIDTH.output,
        x: outputX,
        y: outputY,
        inputData: {
            name: { name: graph.output.name },
            legend: { legendType: graph.output.legend_type ?? 'auto' },
        },
        connections: { inputs: {}, outputs: {} },
    };

    const sourceType = nodes[graph.output.source]?.type as
        | GraphNodeType
        | undefined;
    if (sourceType) {
        addConnection(
            nodes,
            {
                nodeId: graph.output.source,
                portName: OUTPUT_PORT_NAME[sourceType],
            },
            { nodeId: OUTPUT_NODE_ID, portName: 'layer' },
        );
    }

    return nodes;
};
