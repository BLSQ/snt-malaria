import { FlumeGraph, FlumeGraphNode } from '../types/flumeGraph';

const findOutputNode = (graph: FlumeGraph): FlumeGraphNode | undefined =>
    Object.values(graph ?? {}).find(node => node?.type === 'output');

/** Whether the output node has anything wired into its `layer` input. */
export const isOutputConnected = (graph: FlumeGraph): boolean => {
    const sources = findOutputNode(graph)?.connections?.inputs?.layer;
    return Array.isArray(sources) && sources.length > 0;
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
            if (id !== undefined && !Number.isNaN(id) && !ordered.includes(id)) {
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
