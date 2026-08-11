import { FlumeNodes } from 'flume';
import { LegendTypes } from '../../../constants/legend';
import { OPERATOR_OUTPUT_PORT_NAME } from '../nodeTypeRegistry';
import { FlumeGraph, FlumeNodeInputData, NODE_TYPES } from '../types/flumeGraph';
import {
    DagreNodeSpec,
    DagreLayoutResult,
    NODE_HEIGHT,
    NODE_WIDTH,
    runDagreLayout,
} from '../utils/graphLayout';
import { GeneratedGraph, GeneratedGraphNode, GraphNodeType } from './types';

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
    if (node.type === NODE_TYPES.classify) return node.rules?.length ?? 0;
    if (node.type === NODE_TYPES.formula || node.type === NODE_TYPES.combine)
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
    formula: OPERATOR_OUTPUT_PORT_NAME,
    combine: OPERATOR_OUTPUT_PORT_NAME,
    normalize: OPERATOR_OUTPUT_PORT_NAME,
    classify: OPERATOR_OUTPUT_PORT_NAME,
};

// Names given to a formula/combine node's value inputs, in order: a, b, c, … (see flumeConfig.ts).
const formulaInputName = (index: number): string =>
    String.fromCharCode('a'.charCodeAt(0) + index);

const upstreamIds = (node: GeneratedGraphNode): string[] => {
    if (node.type === NODE_TYPES.formula || node.type === NODE_TYPES.combine)
        return node.inputs ?? [];
    if (node.type === NODE_TYPES.classify || node.type === NODE_TYPES.normalize)
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
const collectEdges = (
    graph: GeneratedGraph,
): Array<{ from: string; to: string }> => {
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
        height: estimateNodeHeight(NODE_TYPES.output),
    });
    return runDagreLayout(nodeSpecs, collectEdges(graph));
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
    currentLegend?: FlumeNodeInputData['legend'],
): FlumeNodes => {
    const nodes: FlumeNodes = {};
    const isContentOnlyUpdate = Object.keys(previousNodes).length > 0;
    const dagrePositions = isContentOnlyUpdate
        ? undefined
        : layoutWithDagre(graph);

    const positionFor = (id: string): { x: number; y: number } =>
        (isContentOnlyUpdate ? previousNodes[id] : dagrePositions?.get(id)) ?? {
            x: 0,
            y: 0,
        };

    graph.nodes.forEach(node => {
        const { x, y } = positionFor(node.id);

        if (node.type === NODE_TYPES.dataLayer) {
            nodes[node.id] = {
                id: node.id,
                type: NODE_TYPES.dataLayer,
                width: NODE_WIDTH.dataLayer,
                x,
                y,
                inputData: {
                    metricType: {
                        // Both must be numbers: Flume's Select matches option values with `===`
                        // (see MetricOption / the "Yearly values" control in flumeConfig.ts).
                        metricTypeId: Number(node.metric_type_id),
                        ...(node.selected_year
                            ? { selectedYear: Number(node.selected_year) }
                            : {}),
                    },
                },
                connections: { inputs: {}, outputs: {} },
            };
        } else if (node.type === NODE_TYPES.formula) {
            nodes[node.id] = {
                id: node.id,
                type: NODE_TYPES.formula,
                width: NODE_WIDTH.formula,
                x,
                y,
                inputData: { formula: { formula: node.formula ?? '' } },
                connections: { inputs: {}, outputs: {} },
            };
        } else if (node.type === NODE_TYPES.combine) {
            nodes[node.id] = {
                id: node.id,
                type: NODE_TYPES.combine,
                width: NODE_WIDTH.combine,
                x,
                y,
                inputData: {
                    operation: { operation: node.operation ?? 'mean' },
                },
                connections: { inputs: {}, outputs: {} },
            };
        } else if (node.type === NODE_TYPES.normalize) {
            nodes[node.id] = {
                id: node.id,
                type: NODE_TYPES.normalize,
                width: NODE_WIDTH.normalize,
                x,
                y,
                // The scale/normalizeType controls carry string values, see flumeConfig.ts.
                inputData: {
                    scale: {
                        scale: String(node.scale ?? 1),
                        normalizeType: node.normalize_type ?? 'min-max',
                    },
                },
                connections: { inputs: {}, outputs: {} },
            };
        } else if (node.type === NODE_TYPES.classify) {
            nodes[node.id] = {
                id: node.id,
                type: NODE_TYPES.classify,
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
        if (node.type === NODE_TYPES.formula || node.type === NODE_TYPES.combine) {
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
            (node.type === NODE_TYPES.classify ||
                node.type === NODE_TYPES.normalize) &&
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
        type: NODE_TYPES.output,
        width: NODE_WIDTH.output,
        x: outputX,
        y: outputY,
        // The legend configured for the layer (incl. its manual buckets) is kept unless the AI
        // picks a different legend type.
        inputData: {
            legend:
                graph.output.legend_type &&
                graph.output.legend_type !== currentLegend?.legendType
                    ? { legendType: graph.output.legend_type }
                    : (currentLegend ?? { legendType: LegendTypes.AUTO }),
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
