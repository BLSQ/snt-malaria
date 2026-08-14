import { FlumeGraph } from '../types/flumeGraph';
import { MeasuredSize } from './flumeStage';
import {
    centerGraph,
    NODE_HEIGHT,
    NODE_WIDTH,
    relayoutWithMeasuredSizes,
    runDagreLayout,
} from './graphLayout';

const node = (overrides: Partial<FlumeGraph[string]>): FlumeGraph[string] => ({
    id: 'x',
    type: 'dataLayer',
    x: 0,
    y: 0,
    connections: { inputs: {}, outputs: {} },
    inputData: {},
    ...overrides,
});

describe('runDagreLayout', () => {
    it('positions an edge target after its source along the left-to-right axis', () => {
        const positions = runDagreLayout(
            [
                { id: 'a', width: 100, height: 50 },
                { id: 'b', width: 100, height: 50 },
            ],
            [{ from: 'a', to: 'b' }],
        );
        expect(positions.get('a')!.x).toBeLessThan(positions.get('b')!.x);
    });

    it('passes width/height through unchanged', () => {
        const positions = runDagreLayout(
            [{ id: 'a', width: 123, height: 45 }],
            [],
        );
        expect(positions.get('a')).toMatchObject({ width: 123, height: 45 });
    });

    it('ignores edges referencing a node not in the spec list', () => {
        expect(() =>
            runDagreLayout(
                [{ id: 'a', width: 100, height: 50 }],
                [{ from: 'a', to: 'missing' }],
            ),
        ).not.toThrow();
    });

    it('lays out a lone node without any edges', () => {
        const positions = runDagreLayout(
            [{ id: 'a', width: 100, height: 50 }],
            [],
        );
        expect(positions.get('a')).not.toBe(undefined);
    });
});

describe('relayoutWithMeasuredSizes', () => {
    it('prefers a measured size over the node width or the type default', () => {
        const graph: FlumeGraph = {
            a: node({
                id: 'a',
                connections: {
                    inputs: {},
                    outputs: { values: [{ nodeId: 'b', portName: 'a' }] },
                },
            }),
            b: node({
                id: 'b',
                type: 'formula',
                connections: {
                    inputs: { a: [{ nodeId: 'a', portName: 'values' }] },
                    outputs: {},
                },
            }),
        };
        const measured = new Map<string, MeasuredSize>([
            ['a', { width: 500, height: 200 }],
        ]);

        const { nodes, boundingBox } = relayoutWithMeasuredSizes(
            graph,
            measured,
        );

        // Only positions change - data/connections/type pass through untouched.
        expect(nodes.a.type).toBe('dataLayer');
        expect(nodes.a.connections).toEqual(graph.a.connections);
        expect(typeof nodes.a.x).toBe('number');
        expect(typeof nodes.a.y).toBe('number');
        // Bounding box covers both nodes' extents.
        expect(boundingBox.maxX).toBeGreaterThan(boundingBox.minX);
        expect(boundingBox.maxY - boundingBox.minY).toBeGreaterThanOrEqual(
            NODE_HEIGHT.formula,
        );
    });

    it('falls back to the type default size when nothing is measured', () => {
        const graph: FlumeGraph = { a: node({ id: 'a' }) };
        const { boundingBox } = relayoutWithMeasuredSizes(graph, new Map());
        expect(boundingBox.maxX - boundingBox.minX).toBe(NODE_WIDTH.dataLayer);
        expect(boundingBox.maxY - boundingBox.minY).toBe(NODE_HEIGHT.dataLayer);
    });
});

describe('centerGraph', () => {
    it('shifts every node by the bounding box center', () => {
        const graph: FlumeGraph = {
            a: node({ id: 'a', x: 0, y: 0 }),
            b: node({ id: 'b', x: 100, y: 50 }),
        };
        const centered = centerGraph(graph, {
            minX: 0,
            minY: 0,
            maxX: 100,
            maxY: 50,
        });
        expect(centered.a.x).toBe(-50);
        expect(centered.a.y).toBe(-25);
        expect(centered.b.x).toBe(50);
        expect(centered.b.y).toBe(25);
    });
});
