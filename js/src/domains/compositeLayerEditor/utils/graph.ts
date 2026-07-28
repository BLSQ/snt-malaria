import { FlumeGraph, FlumeGraphNode } from '../types/flumeGraph';

export const findOutputNode = (
    graph: FlumeGraph,
): FlumeGraphNode | undefined =>
    Object.values(graph ?? {}).find(node => node?.type === 'output');

/** Whether the output node has anything wired into its `layer` input. */
export const isOutputConnected = (graph: FlumeGraph): boolean => {
    const sources = findOutputNode(graph)?.connections?.inputs?.layer;
    return Array.isArray(sources) && sources.length > 0;
};

/**
 * Return a copy of the graph with the connection into a given input port removed on both sides
 * (the target's `inputs[port]` and each source's matching `outputs[port]` entry). Backs the
 * drag-an-input-into-empty-space removal gesture (Flume's own port handling is unreliable here).
 */
export const removeInputConnection = (
    graph: FlumeGraph,
    inputNodeId: string,
    inputPortName: string,
): FlumeGraph => {
    const next: FlumeGraph = JSON.parse(JSON.stringify(graph ?? {}));
    const inputNode = next[inputNodeId];
    const sources = inputNode?.connections?.inputs?.[inputPortName];
    if (!inputNode || !sources?.length) return next;

    delete inputNode.connections.inputs[inputPortName];

    sources.forEach(source => {
        const sourceNode = next[source.nodeId];
        const outputs = sourceNode?.connections?.outputs?.[source.portName];
        if (!outputs) return;
        const remaining = outputs.filter(
            target =>
                !(
                    target.nodeId === inputNodeId &&
                    target.portName === inputPortName
                ),
        );
        if (remaining.length) {
            sourceNode.connections.outputs[source.portName] = remaining;
        } else {
            delete sourceNode.connections.outputs[source.portName];
        }
    });

    return next;
};

/**
 * MetricType ids of the data layers wired into the output node, in traversal order (deduped).
 *
 * Walks the graph depth-first from the output node following input connections, so it finds data
 * layers even when they sit behind formula/reclassify nodes. Mirrors the backend traversal in
 * `services/composite/evaluator.py` so the UI ordering matches the backend's default pick.
 */
export const getConnectedDataLayerIds = (graph: FlumeGraph): number[] => {
    const nodes = graph ?? {};
    const output = findOutputNode(nodes);
    if (!output) return [];

    const ordered: number[] = [];
    const visited = new Set<string>();

    const visit = (nodeId: string) => {
        if (visited.has(nodeId)) return;
        visited.add(nodeId);
        const node = nodes[nodeId];
        if (!node) return;
        if (node.type === 'dataLayer') {
            const raw = node.inputData?.metricType?.metricTypeId;
            const id = raw === '' || raw == null ? undefined : Number(raw);
            if (
                id !== undefined &&
                !Number.isNaN(id) &&
                !ordered.includes(id)
            ) {
                ordered.push(id);
            }
        }
        const inputs = node.connections?.inputs ?? {};
        Object.values(inputs).forEach(sources => {
            (sources ?? []).forEach(source => visit(source.nodeId));
        });
    };

    visit(output.id);
    return ordered;
};
