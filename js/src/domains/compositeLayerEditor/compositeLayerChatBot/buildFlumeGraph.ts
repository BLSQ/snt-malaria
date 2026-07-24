import { FlumeNodes } from 'flume';
import { GeneratedGraph, GeneratedGraphNode, GraphNodeType } from './types';

// Layout constants: nodes are placed in columns by graph depth (dataLayer nodes at depth 0),
// stacked top-to-bottom within a column in the order the AI listed them. The output node always
// sits one column past the deepest node.
const COLUMN_WIDTH = 360;
const ROW_HEIGHT = 180;

const NODE_WIDTH: Record<GraphNodeType | 'output', number> = {
    dataLayer: 330,
    formula: 260,
    combine: 260,
    normalize: 260,
    classify: 320,
    output: 330,
};

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

// Depth = longest path back to a dataLayer node, used purely to lay the graph out left-to-right.
// Guards against a malformed (cyclic or self-referencing) AI response by treating any node caught
// mid-traversal as depth 0 rather than recursing forever.
const computeDepths = (nodes: GeneratedGraphNode[]): Map<string, number> => {
    const byId = new Map(nodes.map(node => [node.id, node]));
    const depths = new Map<string, number>();
    const visiting = new Set<string>();

    const depthOf = (id: string): number => {
        if (depths.has(id)) return depths.get(id) as number;
        if (visiting.has(id)) return 0;
        const node = byId.get(id);
        if (!node) return 0;
        visiting.add(id);
        const upstream = upstreamIds(node);
        const depth = upstream.length
            ? 1 + Math.max(...upstream.map(depthOf))
            : 0;
        visiting.delete(id);
        depths.set(id, depth);
        return depth;
    };

    nodes.forEach(node => depthOf(node.id));
    return depths;
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

/**
 * Converts the AI's abstract graph spec into a Flume-compatible node map matching the composite
 * layer editor's real node types (`dataLayer` / `formula` / `combine` / `normalize` / `classify` /
 * `output`, see flumeConfig.ts). Node ids from the spec are reused verbatim as Flume node ids.
 */
export const buildFlumeGraphFromSpec = (graph: GeneratedGraph): FlumeNodes => {
    const nodes: FlumeNodes = {};
    const depths = computeDepths(graph.nodes);
    const rowByDepth = new Map<number, number>();

    const placeAt = (depth: number): { x: number; y: number } => {
        const row = rowByDepth.get(depth) ?? 0;
        rowByDepth.set(depth, row + 1);
        return { x: depth * COLUMN_WIDTH, y: row * ROW_HEIGHT };
    };

    graph.nodes.forEach(node => {
        const { x, y } = placeAt(depths.get(node.id) ?? 0);

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

    // The output node: always exactly one, placed one column past the deepest node.
    const maxDepth = graph.nodes.length
        ? Math.max(...graph.nodes.map(node => depths.get(node.id) ?? 0))
        : 0;
    const { x: outputX, y: outputY } = placeAt(maxDepth + 1);
    const outputId = 'output';

    nodes[outputId] = {
        id: outputId,
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
            { nodeId: outputId, portName: 'layer' },
        );
    }

    return nodes;
};
