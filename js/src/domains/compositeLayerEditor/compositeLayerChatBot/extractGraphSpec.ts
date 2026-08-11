import { ALL_YEARS_VALUE } from '../flumeConfig';
import { FlumeGraph, FlumeGraphNode, NODE_TYPES } from '../types/flumeGraph';
import { normalizeSelection } from '../utils/orgUnitSelection';
import { resolveStackOrder } from '../utils/stackOrder';
import {
    ClassifyRuleSpec,
    CombineOperation,
    CurrentGraph,
    GeneratedGraphNode,
    NormalizeType,
} from './types';

// Upper bound on a formula/combine node's dynamic value inputs (a..z), matching flumeConfig.ts.
const MAX_DYNAMIC_INPUTS = 26;

// Names given to a formula/combine node's value inputs, in order: a, b, c, … (see flumeConfig.ts).
const dynamicInputName = (index: number): string =>
    String.fromCharCode('a'.charCodeAt(0) + index);

// Connected upstream (port, nodeId) pairs in port order (a, b, c, …).
const orderedInputEntries = (
    node: FlumeGraphNode,
): Array<{ port: string; nodeId: string }> => {
    const entries: Array<{ port: string; nodeId: string }> = [];
    for (let index = 0; index < MAX_DYNAMIC_INPUTS; index += 1) {
        const port = dynamicInputName(index);
        const connected = node.connections.inputs[port];
        if (connected?.[0]) entries.push({ port, nodeId: connected[0].nodeId });
    }
    return entries;
};

// Connected upstream node ids in port order (a, b, c, …) - the same order the formula variables
// reference, so it becomes the spec's `inputs` list.
const orderedInputIds = (node: FlumeGraphNode): string[] =>
    orderedInputEntries(node).map(entry => entry.nodeId);

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
        if (node.type === NODE_TYPES.dataLayer) {
            const rawId = inputData.metricType?.metricTypeId;
            const rawYear = inputData.metricType?.selectedYear;
            const hasPinnedYear =
                rawYear !== undefined &&
                rawYear !== '' &&
                rawYear !== ALL_YEARS_VALUE;
            nodes.push({
                id: node.id,
                type: NODE_TYPES.dataLayer,
                ...(rawId !== undefined && rawId !== ''
                    ? { metric_type_id: String(rawId) }
                    : {}),
                ...(hasPinnedYear ? { selected_year: String(rawYear) } : {}),
            });
        } else if (node.type === NODE_TYPES.formula) {
            nodes.push({
                id: node.id,
                type: NODE_TYPES.formula,
                inputs: orderedInputIds(node),
                formula: (inputData.formula?.formula as string) ?? '',
            });
        } else if (node.type === NODE_TYPES.combine) {
            const operation =
                (inputData.operation?.operation as CombineOperation) ??
                'mean';
            const entries = orderedInputEntries(node);
            // For "stack", the spec's `inputs` order IS the priority order (ascending - last
            // wins), so emit the resolved priority order rather than plain port order, so the
            // round-tripped spec still matches whatever the user last set via the priority control.
            const inputs =
                operation === 'stack'
                    ? resolveStackOrder(
                          inputData.operation?.priorityOrder,
                          entries.map(entry => entry.port),
                      )
                          .map(
                              port =>
                                  entries.find(entry => entry.port === port)
                                      ?.nodeId,
                          )
                          .filter((id): id is string => id !== undefined)
                    : entries.map(entry => entry.nodeId);
            nodes.push({
                id: node.id,
                type: NODE_TYPES.combine,
                inputs,
                operation,
            });
        } else if (node.type === NODE_TYPES.normalize) {
            nodes.push({
                id: node.id,
                type: NODE_TYPES.normalize,
                input: singleInputId(node, 'a'),
                // The scale/normalizeType controls store string values, see flumeConfig.ts.
                scale: Number(inputData.scale?.scale ?? '1') as 1 | 100,
                normalize_type:
                    (inputData.scale?.normalizeType as NormalizeType) ??
                    'min-max',
            });
        } else if (node.type === NODE_TYPES.classify) {
            const config = inputData.config?.rules as
                | { rules?: ClassifyRuleSpec[]; default?: string }
                | undefined;
            nodes.push({
                id: node.id,
                type: NODE_TYPES.classify,
                input: singleInputId(node, 'a'),
                rules: config?.rules ?? [],
                default: config?.default ?? '',
            });
        } else if (node.type === NODE_TYPES.filter) {
            nodes.push({
                id: node.id,
                type: NODE_TYPES.filter,
                input: singleInputId(node, 'a'),
                org_units: normalizeSelection(
                    inputData.selection?.orgUnits,
                ),
            });
        } else if (node.type === NODE_TYPES.output) {
            outputNode = node;
        }
        // Any other node type (e.g. a canvas comment) is not part of the spec contract - skip it.
    });

    if (nodes.length === 0) return null;

    return {
        nodes,
        output: {
            source: outputNode
                ? (singleInputId(outputNode, 'layer') ?? null)
                : null,
            // The layer name is owned by the creation dialogue, not the graph.
            name: '',
            legend_type:
                (outputNode?.inputData.legend?.legendType as string) ?? 'auto',
        },
    };
};
