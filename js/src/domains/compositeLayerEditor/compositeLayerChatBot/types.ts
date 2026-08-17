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

export type CombineOperation = 'mean' | 'sum' | 'min' | 'max' | 'stack';

export type NormalizeType = 'min-max' | 'percentile';

export type OrgUnitSelectionSpec = {
    mode: 'all' | 'none';
    ids?: number[];
};

export type GraphNodeType =
    | 'dataLayer'
    | 'formula'
    | 'combine'
    | 'normalize'
    | 'classify'
    | 'filter';

// A single abstract node in the AI-generated graph. Which fields are relevant depends on `type`:
// dataLayer -> metric_type_id (+ optional selected_year); formula -> inputs + formula;
// combine -> inputs + operation (`inputs` order IS the priority order when operation is "stack",
// ascending - the LAST entry wins); normalize -> input + scale + normalize_type;
// classify -> input + rules + default; filter -> input + org_units.
export type GeneratedGraphNode = {
    id: string;
    type: GraphNodeType;
    metric_type_id?: string;
    /** Pins a `dataLayer` node to this single year (as a string), turning it non-yearly. */
    selected_year?: string;
    inputs?: string[];
    formula?: string;
    operation?: CombineOperation;
    input?: string;
    rules?: ClassifyRuleSpec[];
    default?: string;
    scale?: 1 | 100;
    normalize_type?: NormalizeType;
    org_units?: OrgUnitSelectionSpec;
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

// The graph currently open in the editor, sent as context so the AI can make iterative changes.
// Same shape as GeneratedGraph, except the output may not be wired up yet (`source: null`) and the
// legend may use editor-only values (e.g. 'reference') outside the AI's LegendType enum.
export type CurrentGraphOutput = {
    source: string | null;
    name: string;
    legend_type: string;
};

export type CurrentGraph = {
    nodes: GeneratedGraphNode[];
    output: CurrentGraphOutput;
};

export type CompositeLayerAIRequest = {
    message: string;
    conversation_history: ConversationEntry[];
    current_graph?: CurrentGraph | null;
};

export type CompositeLayerAIResponse = {
    assistant_message: string;
    graph: GeneratedGraph | null;
    conversation_history: ConversationEntry[];
};
