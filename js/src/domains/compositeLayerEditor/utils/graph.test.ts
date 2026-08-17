import { ALL_YEARS_VALUE } from '../flumeConfig';
import { FlumeGraph } from '../types/flumeGraph';
import {
    findOutputNode,
    getAllDataLayerMetricTypeIds,
    getConnectedDataLayerIds,
    isOutputConnected,
    removeInputConnection,
    withDefaultSelectedYear,
} from './graph';

const node = (overrides: Partial<FlumeGraph[string]>): FlumeGraph[string] => ({
    id: 'x',
    type: 'dataLayer',
    x: 0,
    y: 0,
    connections: { inputs: {}, outputs: {} },
    inputData: {},
    ...overrides,
});

describe('findOutputNode', () => {
    it('finds the output node in the graph', () => {
        const output = node({ id: 'out', type: 'output' });
        const graph: FlumeGraph = {
            layer1: node({ id: 'layer1' }),
            out: output,
        };
        expect(findOutputNode(graph)).toBe(output);
    });

    it('returns undefined when there is no output node', () => {
        expect(findOutputNode({ layer1: node({ id: 'layer1' }) })).toBe(
            undefined,
        );
    });

    it('handles an undefined/empty graph', () => {
        expect(findOutputNode(undefined as unknown as FlumeGraph)).toBe(
            undefined,
        );
        expect(findOutputNode({})).toBe(undefined);
    });
});

describe('isOutputConnected', () => {
    it('is true when the output has a source wired into "layer"', () => {
        const graph: FlumeGraph = {
            out: node({
                id: 'out',
                type: 'output',
                connections: {
                    inputs: {
                        layer: [{ nodeId: 'layer1', portName: 'values' }],
                    },
                    outputs: {},
                },
            }),
        };
        expect(isOutputConnected(graph)).toBe(true);
    });

    it('is false when the output exists but has nothing wired in', () => {
        const graph: FlumeGraph = { out: node({ id: 'out', type: 'output' }) };
        expect(isOutputConnected(graph)).toBe(false);
    });

    it('is false when there is no output node at all', () => {
        expect(isOutputConnected({})).toBe(false);
    });
});

describe('removeInputConnection', () => {
    it('removes the connection on both the input side and the matching output side', () => {
        const graph: FlumeGraph = {
            layer1: node({
                id: 'layer1',
                connections: {
                    inputs: {},
                    outputs: { values: [{ nodeId: 'filt', portName: 'a' }] },
                },
            }),
            filt: node({
                id: 'filt',
                type: 'filter',
                connections: {
                    inputs: { a: [{ nodeId: 'layer1', portName: 'values' }] },
                    outputs: {},
                },
            }),
        };

        const next = removeInputConnection(graph, 'filt', 'a');

        expect(next.filt.connections.inputs).toEqual({});
        expect(next.layer1.connections.outputs).toEqual({});
        // Original graph is untouched.
        expect(graph.filt.connections.inputs.a).toHaveLength(1);
    });

    it('leaves other outputs of the same source port alone', () => {
        const graph: FlumeGraph = {
            layer1: node({
                id: 'layer1',
                connections: {
                    inputs: {},
                    outputs: {
                        values: [
                            { nodeId: 'filt', portName: 'a' },
                            { nodeId: 'norm', portName: 'a' },
                        ],
                    },
                },
            }),
            filt: node({
                id: 'filt',
                type: 'filter',
                connections: {
                    inputs: { a: [{ nodeId: 'layer1', portName: 'values' }] },
                    outputs: {},
                },
            }),
        };

        const next = removeInputConnection(graph, 'filt', 'a');

        expect(next.layer1.connections.outputs.values).toEqual([
            { nodeId: 'norm', portName: 'a' },
        ]);
    });

    it('is a no-op when the target port has no connection', () => {
        const graph: FlumeGraph = {
            filt: node({ id: 'filt', type: 'filter' }),
        };
        const next = removeInputConnection(graph, 'filt', 'a');
        expect(next).toEqual(graph);
    });
});

describe('getConnectedDataLayerIds', () => {
    it('finds data layers behind a chain of transform nodes, deduped, in traversal order', () => {
        const graph: FlumeGraph = {
            out: node({
                id: 'out',
                type: 'output',
                connections: {
                    inputs: { layer: [{ nodeId: 'norm', portName: 'result' }] },
                    outputs: {},
                },
            }),
            norm: node({
                id: 'norm',
                type: 'normalize',
                connections: {
                    inputs: { a: [{ nodeId: 'layer1', portName: 'values' }] },
                    outputs: {},
                },
            }),
            layer1: node({
                id: 'layer1',
                inputData: { metricType: { metricTypeId: 5 } },
            }),
        };
        expect(getConnectedDataLayerIds(graph)).toEqual([5]);
    });

    it('ignores a data layer that is not connected to the output', () => {
        const graph: FlumeGraph = {
            out: node({ id: 'out', type: 'output' }),
            layer1: node({
                id: 'layer1',
                inputData: { metricType: { metricTypeId: 5 } },
            }),
        };
        expect(getConnectedDataLayerIds(graph)).toEqual([]);
    });

    it('returns an empty array when there is no output node', () => {
        expect(
            getConnectedDataLayerIds({
                layer1: node({
                    id: 'layer1',
                    inputData: { metricType: { metricTypeId: 5 } },
                }),
            }),
        ).toEqual([]);
    });

    it('dedupes the same metric type reused via two data layer nodes', () => {
        const graph: FlumeGraph = {
            out: node({
                id: 'out',
                type: 'output',
                connections: {
                    inputs: {
                        layer: [{ nodeId: 'formula1', portName: 'result' }],
                    },
                    outputs: {},
                },
            }),
            formula1: node({
                id: 'formula1',
                type: 'formula',
                connections: {
                    inputs: {
                        a: [{ nodeId: 'layer1', portName: 'values' }],
                        b: [{ nodeId: 'layer2', portName: 'values' }],
                    },
                    outputs: {},
                },
            }),
            layer1: node({
                id: 'layer1',
                inputData: { metricType: { metricTypeId: 5 } },
            }),
            layer2: node({
                id: 'layer2',
                inputData: { metricType: { metricTypeId: 5 } },
            }),
        };
        expect(getConnectedDataLayerIds(graph)).toEqual([5]);
    });

    it('skips a data layer node with no metric type picked yet', () => {
        const graph: FlumeGraph = {
            out: node({
                id: 'out',
                type: 'output',
                connections: {
                    inputs: {
                        layer: [{ nodeId: 'layer1', portName: 'values' }],
                    },
                    outputs: {},
                },
            }),
            layer1: node({ id: 'layer1', inputData: {} }),
        };
        expect(getConnectedDataLayerIds(graph)).toEqual([]);
    });
});

describe('getAllDataLayerMetricTypeIds', () => {
    it('returns every picked metric type id, connected or not, deduped', () => {
        const graph: FlumeGraph = {
            layer1: node({
                id: 'layer1',
                inputData: { metricType: { metricTypeId: 5 } },
            }),
            layer2: node({
                id: 'layer2',
                inputData: { metricType: { metricTypeId: 7 } },
            }),
            layer3: node({
                id: 'layer3',
                inputData: { metricType: { metricTypeId: 5 } },
            }),
            filt: node({ id: 'filt', type: 'filter' }),
        };
        expect(getAllDataLayerMetricTypeIds(graph).sort()).toEqual([5, 7]);
    });

    it('ignores data layers with no metric type picked yet', () => {
        const graph: FlumeGraph = {
            layer1: node({ id: 'layer1', inputData: {} }),
        };
        expect(getAllDataLayerMetricTypeIds(graph)).toEqual([]);
    });
});

describe('withDefaultSelectedYear', () => {
    it('backfills "all" onto a data layer node missing selectedYear', () => {
        const graph: FlumeGraph = {
            layer1: node({
                id: 'layer1',
                inputData: { metricType: { metricTypeId: 5 } },
            }),
        };
        const next = withDefaultSelectedYear(graph);
        expect(next?.layer1.inputData.metricType?.selectedYear).toBe(
            ALL_YEARS_VALUE,
        );
    });

    it('leaves a node that already has a selectedYear (even "") untouched', () => {
        const graph: FlumeGraph = {
            layer1: node({
                id: 'layer1',
                inputData: {
                    metricType: { metricTypeId: 5, selectedYear: '' },
                },
            }),
        };
        expect(withDefaultSelectedYear(graph)).toBe(graph);
    });

    it('ignores non-dataLayer nodes', () => {
        const graph: FlumeGraph = {
            filt: node({ id: 'filt', type: 'filter' }),
        };
        expect(withDefaultSelectedYear(graph)).toBe(graph);
    });

    it('passes through an undefined graph', () => {
        expect(withDefaultSelectedYear(undefined)).toBe(undefined);
    });
});
