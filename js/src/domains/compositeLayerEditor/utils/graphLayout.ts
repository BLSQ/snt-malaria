import dagre from 'dagre';
import { OPERATOR_NODE_TYPES } from '../nodeTypeRegistry';
import { CompositeNodeType, FlumeGraph } from '../types/flumeGraph';
import { MeasuredSize } from './flumeStage';

// Horizontal gap dagre leaves between ranks (columns), and vertical gap between nodes stacked in
// the same rank.
const DAGRE_RANK_SEP = 60;
const DAGRE_NODE_SEP = 24;

export const NODE_WIDTH: Record<CompositeNodeType, number> = {
    dataLayer: 330,
    formula: OPERATOR_NODE_TYPES.formula.width,
    combine: OPERATOR_NODE_TYPES.combine.width,
    normalize: OPERATOR_NODE_TYPES.normalize.width,
    classify: OPERATOR_NODE_TYPES.classify.width,
    output: 330,
};

// Rough rendered height per node type, to size dagre's layout so rows don't overlap - not
// pixel-exact. `dataLayer`/`output` default to an EXPANDED map preview (flumeConfig.ts:
// `expanded: data?.expanded ?? true`), so their estimate includes the map. dagre's estimate pass
// is corrected against real DOM sizes afterwards (see `relayoutWithMeasuredSizes`).
export const NODE_HEIGHT: Record<CompositeNodeType, number> = {
    dataLayer: 360,
    formula: 150,
    combine: 140,
    normalize: 130,
    classify: 140,
    output: 410,
};

export type DagreNodeSpec = { id: string; width: number; height: number };
export type DagreEdge = { from: string; to: string };
export type DagreLayoutResult = {
    x: number;
    y: number;
    width: number;
    height: number;
};

/**
 * Lays out a set of nodes with dagre (layered "Sugiyama-style" left-to-right layout). Shared by
 * the AI chat bot's size-estimate pass and `relayoutWithMeasuredSizes` (real DOM sizes); they
 * differ only in where node sizes and edges come from.
 */
export const runDagreLayout = (
    nodeSpecs: DagreNodeSpec[],
    edges: DagreEdge[],
): Map<string, DagreLayoutResult> => {
    const g = new dagre.graphlib.Graph();
    g.setGraph({
        rankdir: 'LR',
        nodesep: DAGRE_NODE_SEP,
        ranksep: DAGRE_RANK_SEP,
    });
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
        positions.set(id, {
            x: x - width / 2,
            y: y - height / 2,
            width,
            height,
        });
    });
    return positions;
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

// Edges from an already-wired FlumeGraph, read uniformly from each node's `connections.inputs`.
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
