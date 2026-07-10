export type ConversationEntry = {
    role: 'user' | 'assistant';
    content: string;
};

export type ClassifyOperator = '<' | '<=' | '>' | '>=' | '==' | '!=';

export type ClassifyRuleSpec = {
    op: ClassifyOperator;
    value: number;
    label: string;
};

export type CombineOperation = 'mean' | 'sum' | 'min' | 'max';

export type GraphNodeType =
    | 'dataLayer'
    | 'formula'
    | 'combine'
    | 'normalize'
    | 'classify';

// A single abstract node in the AI-generated graph. Which fields are relevant depends on `type`:
// dataLayer -> metric_type_id; formula -> inputs + formula; combine -> inputs + operation;
// normalize -> input + scale; classify -> input + rules + default.
export type GeneratedGraphNode = {
    id: string;
    type: GraphNodeType;
    metric_type_id?: string;
    inputs?: string[];
    formula?: string;
    operation?: CombineOperation;
    input?: string;
    rules?: ClassifyRuleSpec[];
    default?: string;
    scale?: 1 | 100;
};

export type LegendType = 'auto' | 'linear' | 'threshold' | 'ordinal';

export type GeneratedGraphOutput = {
    source: string;
    name: string;
    legend_type: LegendType;
};

export type GeneratedGraph = {
    nodes: GeneratedGraphNode[];
    output: GeneratedGraphOutput;
};

export type CompositeLayerAIRequest = {
    message: string;
    conversation_history: ConversationEntry[];
};

export type CompositeLayerAIResponse = {
    assistant_message: string;
    graph: GeneratedGraph | null;
    conversation_history: ConversationEntry[];
};
