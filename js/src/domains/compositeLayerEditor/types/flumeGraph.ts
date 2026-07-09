/**
 * Shapes of the serialized Flume graph, as consumed by the backend evaluator
 * (`services/composite/evaluator.py`). The node/port/control names used here are the contract
 * between the editor and the backend.
 */

/** One end of a connection: the node and port it attaches to. */
export type FlumeConnection = {
    nodeId: string;
    portName: string;
};

export type FlumeNodeConnections = {
    inputs: Record<string, FlumeConnection[]>;
    outputs: Record<string, FlumeConnection[]>;
};

export type CompositeNodeType = 'dataLayer' | 'formula' | 'classify' | 'output';

/**
 * Per-port control values. The keys are port names; the nested keys are control names. The two
 * shapes read outside of Flume controls are typed explicitly.
 */
export type FlumeNodeInputData = {
    metricType?: { metricTypeId?: number | string };
    legend?: { legendType?: string };
} & Record<string, Record<string, unknown> | undefined>;

export type FlumeGraphNode = {
    id: string;
    type: CompositeNodeType;
    x: number;
    y: number;
    width?: number;
    connections: FlumeNodeConnections;
    inputData: FlumeNodeInputData;
};

/** A serialized Flume graph: `{ nodeId: node }`. */
export type FlumeGraph = Record<string, FlumeGraphNode>;
