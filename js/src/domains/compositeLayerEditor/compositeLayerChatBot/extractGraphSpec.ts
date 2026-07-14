import { FlumeGraph, FlumeGraphNode } from '../types/flumeGraph';
import {
    ClassifyRuleSpec,
    CombineOperation,
    CurrentGraph,
    GeneratedGraphNode,
} from './types';

// Upper bound on a formula/combine node's dynamic value inputs (a..z), matching flumeConfig.ts.
const MAX_DYNAMIC_INPUTS = 26;

// Names given to a formula/combine node's value inputs, in order: a, b, c, … (see flumeConfig.ts).
const dynamicInputName = (index: number): string =>
    String.fromCharCode('a'.charCodeAt(0) + index);

// Connected upstream node ids in port order (a, b, c, …) - the same order the formula variables
// reference, so it becomes the spec's `inputs` list.
const orderedInputIds = (node: FlumeGraphNode): string[] => {
    const ids: string[] = [];
    for (let index = 0; index < MAX_DYNAMIC_INPUTS; index += 1) {
        const connected = node.connections.inputs[dynamicInputName(index)];
        if (connected?.[0]) ids.push(connected[0].nodeId);
    }
    return ids;
};

const singleInputId = (
    node: FlumeGraphNode,
    portName: string,
): string | undefined => node.connections.inputs[portName]?.[0]?.nodeId;

/**
 * Converts the editor's Flume node map back into the abstract graph spec the AI works with - the
 * exact reverse of `buildFlumeGraphFromSpec`. Sent as chat context so the model can make iterative
 * changes relative to what's on the canvas. Returns null for an effectively empty editor (only the
 * default output node), so no context is sent at all in that case.
 */
export const extractGraphSpecFromFlume = (
    graph: FlumeGraph,
): CurrentGraph | null => {
    const nodes: GeneratedGraphNode[] = [];
    let outputNode: FlumeGraphNode | undefined;

    Object.values(graph).forEach(node => {
        const { inputData } = node;
        if (node.type === 'dataLayer') {
            const rawId = inputData.metricType?.metricTypeId;
            nodes.push({
                id: node.id,
                type: 'dataLayer',
                ...(rawId !== undefined && rawId !== ''
                    ? { metric_type_id: String(rawId) }
                    : {}),
            });
        } else if (node.type === 'formula') {
            nodes.push({
                id: node.id,
                type: 'formula',
                inputs: orderedInputIds(node),
                formula: (inputData.formula?.formula as string) ?? '',
            });
        } else if (node.type === 'combine') {
            nodes.push({
                id: node.id,
                type: 'combine',
                inputs: orderedInputIds(node),
                operation:
                    (inputData.operation?.operation as CombineOperation) ??
                    'mean',
            });
        } else if (node.type === 'normalize') {
            nodes.push({
                id: node.id,
                type: 'normalize',
                input: singleInputId(node, 'a'),
                // The scale control stores string values ('1'/'100'), see flumeConfig.ts.
                scale: Number(inputData.scale?.scale ?? '1') as 1 | 100,
            });
        } else if (node.type === 'classify') {
            const config = inputData.config?.rules as
                | { rules?: ClassifyRuleSpec[]; default?: string }
                | undefined;
            nodes.push({
                id: node.id,
                type: 'classify',
                input: singleInputId(node, 'a'),
                rules: config?.rules ?? [],
                default: config?.default ?? '',
            });
        } else if (node.type === 'output') {
            outputNode = node;
        }
        // Any other node type is not part of the spec contract - skip it.
    });

    if (nodes.length === 0) return null;

    return {
        nodes,
        output: {
            source: outputNode ? (singleInputId(outputNode, 'layer') ?? null) : null,
            name: ((outputNode?.inputData.name?.name as string) ?? '').trim(),
            legend_type:
                (outputNode?.inputData.legend?.legendType as string) ?? 'auto',
        },
    };
};
