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

// Rough rendered height per node type, used to size dagre's layout so rows don't overlap - not
// meant to be pixel-exact. `dataLayer` and `output` both default to an EXPANDED map preview (see
// the `mapPreview`/`outputPreview` controls in flumeConfig.ts - `expanded: data?.expanded ?? true`),
// so their estimate has to account for the map, not just the header/controls. Their long data
// layer name can also wrap to 2 lines, which isn't modeled here (we have no DOM to measure and the
// resolved layer name isn't available in this pure spec-to-layout function) - the extra margin
// below is a heuristic buffer for that, not a guarantee.
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

// formula/combine render one port row per *connected* input, plus one trailing empty slot to drop
// the next connection onto (see `dynamicInputCount` in flumeConfig.ts) - the trailing slot is
// already folded into NODE_HEIGHT.formula/combine below, so only connected inputs add height here.
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
 * Lays out a set of nodes with dagre - a standard layered ("Sugiyama-style") graph drawing
 * algorithm: it assigns each node to a rank based on the longest path back to a source, orders
 * nodes within a rank to minimize edge crossings, then assigns concrete coordinates given each
 * node's width/height and the requested spacing. Shared by `layoutWithDagre` (size estimates, a
 * structural update's first pass) and `relayoutWithMeasuredSizes` (real DOM sizes) below - they
 * differ only in where node sizes and edges come from.
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

/**
 * Lays out the whole graph (including the synthetic output node) using size *estimates* (real
 * sizes don't exist yet - nothing has rendered). Used only for a "structural" update's first pass
 * (nodes added or removed) - see `buildFlumeGraphFromSpec`.
 */
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

// Edges from an already-wired FlumeGraph (post `buildFlumeGraphFromSpec`) - every node's
// `connections.inputs` already lists its upstream neighbors, regardless of type or port names, so
// this covers every node type uniformly (unlike `collectEdges` above, which has to know each
// type's specific input/inputs/source field on the AI's abstract spec).
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
 * Re-lays-out an already-built graph using REAL measured node sizes instead of the `NODE_HEIGHT`/
 * `NODE_WIDTH` estimates - those get dagre's first pass close, but can't account for content that
 * only determines its own size once actually rendered (a data layer name wrapping to 2 lines, a
 * classify node's exact rules-table height, ...). Meant to be called once, with sizes measured off
 * the real DOM (see `handleGenerateGraph`/`handleRearrange` in index.tsx) - only positions change
 * here; every node's own data/connections pass through untouched. Also returns the resulting
 * bounding box, so the caller can frame it (see `centerGraph`) without re-measuring.
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
 * Shifts every node so the graph's bounding box is centered on the stage origin (0,0) - combined
 * with Flume's own default `translate: {x:0,y:0}` on a fresh mount, this makes the box's center
 * land exactly at the viewport's center with no pan needed. Paired with `computeFitScale` (from
 * `utils/flumeStage.ts`) as `initialScale`, a graph can arrive pre-framed on its very first paint
 * instead of needing a live measure-and-fit pass after the fact.
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
 * - Passed as the current canvas graph when the update is content-only (same node ids as before,
 *   just parameter changes) - every node then keeps its exact previous `x`/`y`, so nothing moves.
 * - Passed as `{}` (the default) for a structural update (nodes added or removed, including the
 *   very first generation) - every node's position is (re)computed from scratch with dagre. This
 *   deliberately re-lays-out the whole graph rather than only the new nodes; it's simpler than
 *   pinning existing nodes and only placing new ones, at the cost of also moving nodes the user
 *   may have manually dragged, but only when the graph's shape actually changed.
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
                    // The select's options carry a numeric `value` (see MetricOption in
                    // flumeConfig.ts) and Flume's Select matches the current value against them
                    // with `===`, so this must be a number - a string id would render as neither
                    // the picked label nor the placeholder.
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
