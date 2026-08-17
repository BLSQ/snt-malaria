import { FlumeGraph } from '../types/flumeGraph';
import { extractGraphSpecFromFlume } from './extractGraphSpec';

const node = (overrides: Partial<FlumeGraph[string]>): FlumeGraph[string] => ({
    id: 'x',
    type: 'dataLayer',
    x: 0,
    y: 0,
    connections: { inputs: {}, outputs: {} },
    inputData: {},
    ...overrides,
});

describe('extractGraphSpecFromFlume', () => {
    it('returns null for an effectively empty editor (only the default output node)', () => {
        const graph: FlumeGraph = { out: node({ id: 'out', type: 'output' }) };
        expect(extractGraphSpecFromFlume(graph)).toBe(null);
    });

    it('returns null for a genuinely empty graph', () => {
        expect(extractGraphSpecFromFlume({})).toBe(null);
    });

    describe('dataLayer', () => {
        it('extracts the metric type id, with no selected_year when unpinned', () => {
            const graph: FlumeGraph = {
                layer1: node({
                    id: 'layer1',
                    inputData: { metricType: { metricTypeId: 5 } },
                }),
            };
            const spec = extractGraphSpecFromFlume(graph);
            expect(spec?.nodes[0]).toEqual({
                id: 'layer1',
                type: 'dataLayer',
                metric_type_id: '5',
            });
        });

        it('includes selected_year when pinned to a real year', () => {
            const graph: FlumeGraph = {
                layer1: node({
                    id: 'layer1',
                    inputData: {
                        metricType: { metricTypeId: 5, selectedYear: 2023 },
                    },
                }),
            };
            const spec = extractGraphSpecFromFlume(graph);
            expect(spec?.nodes[0]).toEqual({
                id: 'layer1',
                type: 'dataLayer',
                metric_type_id: '5',
                selected_year: '2023',
            });
        });

        it('omits selected_year for the "all years" sentinel value', () => {
            const graph: FlumeGraph = {
                layer1: node({
                    id: 'layer1',
                    inputData: {
                        metricType: { metricTypeId: 5, selectedYear: 'all' },
                    },
                }),
            };
            const spec = extractGraphSpecFromFlume(graph);
            expect(spec?.nodes[0]).not.toHaveProperty('selected_year');
        });

        it('omits metric_type_id when no layer has been picked yet', () => {
            const graph: FlumeGraph = { layer1: node({ id: 'layer1' }) };
            const spec = extractGraphSpecFromFlume(graph);
            expect(spec?.nodes[0]).toEqual({
                id: 'layer1',
                type: 'dataLayer',
            });
        });
    });

    it('extracts a formula node with its inputs in port order and its expression', () => {
        const graph: FlumeGraph = {
            f: node({
                id: 'f',
                type: 'formula',
                connections: {
                    inputs: {
                        a: [{ nodeId: 'layer1', portName: 'values' }],
                        b: [{ nodeId: 'layer2', portName: 'values' }],
                    },
                    outputs: {},
                },
                inputData: { formula: { formula: 'a + b' } },
            }),
        };
        const spec = extractGraphSpecFromFlume(graph);
        expect(spec?.nodes[0]).toEqual({
            id: 'f',
            type: 'formula',
            inputs: ['layer1', 'layer2'],
            formula: 'a + b',
        });
    });

    describe('combine', () => {
        it('extracts a symmetric operation with inputs in plain port order', () => {
            const graph: FlumeGraph = {
                c: node({
                    id: 'c',
                    type: 'combine',
                    connections: {
                        inputs: {
                            a: [{ nodeId: 'layer1', portName: 'values' }],
                            b: [{ nodeId: 'layer2', portName: 'values' }],
                        },
                        outputs: {},
                    },
                    inputData: { operation: { operation: 'sum' } },
                }),
            };
            const spec = extractGraphSpecFromFlume(graph);
            expect(spec?.nodes[0]).toEqual({
                id: 'c',
                type: 'combine',
                inputs: ['layer1', 'layer2'],
                operation: 'sum',
            });
        });

        it('defaults to "mean" when no operation has been picked yet', () => {
            const graph: FlumeGraph = {
                c: node({
                    id: 'c',
                    type: 'combine',
                    connections: {
                        inputs: {
                            a: [{ nodeId: 'layer1', portName: 'values' }],
                        },
                        outputs: {},
                    },
                }),
            };
            const spec = extractGraphSpecFromFlume(graph);
            expect(spec?.nodes[0].operation).toBe('mean');
        });

        it('for "stack", emits inputs in the resolved priority order rather than port order', () => {
            const graph: FlumeGraph = {
                c: node({
                    id: 'c',
                    type: 'combine',
                    connections: {
                        inputs: {
                            a: [{ nodeId: 'layer1', portName: 'values' }],
                            b: [{ nodeId: 'layer2', portName: 'values' }],
                        },
                        outputs: {},
                    },
                    inputData: {
                        operation: {
                            operation: 'stack',
                            priorityOrder: ['b', 'a'],
                        },
                    },
                }),
            };
            const spec = extractGraphSpecFromFlume(graph);
            expect(spec?.nodes[0]).toEqual({
                id: 'c',
                type: 'combine',
                inputs: ['layer2', 'layer1'],
                operation: 'stack',
            });
        });

        it('for "stack" with no priorityOrder yet, falls back to sorted port order', () => {
            const graph: FlumeGraph = {
                c: node({
                    id: 'c',
                    type: 'combine',
                    connections: {
                        inputs: {
                            a: [{ nodeId: 'layer1', portName: 'values' }],
                            b: [{ nodeId: 'layer2', portName: 'values' }],
                        },
                        outputs: {},
                    },
                    inputData: { operation: { operation: 'stack' } },
                }),
            };
            const spec = extractGraphSpecFromFlume(graph);
            expect(spec?.nodes[0].inputs).toEqual(['layer1', 'layer2']);
        });
    });

    it('extracts a normalize node, defaulting normalize_type to "min-max"', () => {
        const graph: FlumeGraph = {
            n: node({
                id: 'n',
                type: 'normalize',
                connections: {
                    inputs: { a: [{ nodeId: 'layer1', portName: 'values' }] },
                    outputs: {},
                },
                inputData: { scale: { scale: '100' } },
            }),
        };
        const spec = extractGraphSpecFromFlume(graph);
        expect(spec?.nodes[0]).toEqual({
            id: 'n',
            type: 'normalize',
            input: 'layer1',
            scale: 100,
            normalize_type: 'min-max',
        });
    });

    it('extracts a classify node with its rules and default label', () => {
        const graph: FlumeGraph = {
            cl: node({
                id: 'cl',
                type: 'classify',
                connections: {
                    inputs: { a: [{ nodeId: 'layer1', portName: 'values' }] },
                    outputs: {},
                },
                inputData: {
                    config: {
                        rules: {
                            rules: [{ op: '<', value: 100, label: 'Low' }],
                            default: 'High',
                        },
                    },
                },
            }),
        };
        const spec = extractGraphSpecFromFlume(graph);
        expect(spec?.nodes[0]).toEqual({
            id: 'cl',
            type: 'classify',
            input: 'layer1',
            rules: [{ op: '<', value: 100, label: 'Low' }],
            default: 'High',
        });
    });

    it('extracts a filter node, normalizing its org unit selection', () => {
        const graph: FlumeGraph = {
            filt: node({
                id: 'filt',
                type: 'filter',
                connections: {
                    inputs: { a: [{ nodeId: 'layer1', portName: 'values' }] },
                    outputs: {},
                },
                inputData: {
                    selection: { orgUnits: { mode: 'none', ids: [1, 2] } },
                },
            }),
        };
        const spec = extractGraphSpecFromFlume(graph);
        expect(spec?.nodes[0]).toEqual({
            id: 'filt',
            type: 'filter',
            input: 'layer1',
            org_units: { mode: 'none', ids: [1, 2] },
        });
    });

    describe('output', () => {
        it('reports the source wired into the output and its legend type', () => {
            const graph: FlumeGraph = {
                layer1: node({
                    id: 'layer1',
                    inputData: { metricType: { metricTypeId: 5 } },
                }),
                out: node({
                    id: 'out',
                    type: 'output',
                    connections: {
                        inputs: {
                            layer: [{ nodeId: 'layer1', portName: 'values' }],
                        },
                        outputs: {},
                    },
                    inputData: { legend: { legendType: 'ordinal' } },
                }),
            };
            const spec = extractGraphSpecFromFlume(graph);
            expect(spec?.output).toEqual({
                source: 'layer1',
                name: '',
                legend_type: 'ordinal',
            });
        });

        it('defaults legend_type to "auto" and source to null when nothing is wired in', () => {
            const graph: FlumeGraph = {
                layer1: node({
                    id: 'layer1',
                    inputData: { metricType: { metricTypeId: 5 } },
                }),
                out: node({ id: 'out', type: 'output' }),
            };
            const spec = extractGraphSpecFromFlume(graph);
            expect(spec?.output).toEqual({
                source: null,
                name: '',
                legend_type: 'auto',
            });
        });
    });

    it('skips node types outside the spec contract (e.g. a canvas comment-like node)', () => {
        const graph: FlumeGraph = {
            layer1: node({
                id: 'layer1',
                inputData: { metricType: { metricTypeId: 5 } },
            }),
            weird: node({ id: 'weird', type: 'unknown' as never }),
        };
        const spec = extractGraphSpecFromFlume(graph);
        expect(spec?.nodes).toHaveLength(1);
        expect(spec?.nodes[0].id).toBe('layer1');
    });
});
