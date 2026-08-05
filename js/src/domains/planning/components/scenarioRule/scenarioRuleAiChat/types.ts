import { MetricTypeCriterion } from '../../../types/scenarioRule';

export type ConversationEntry = {
    role: 'user' | 'assistant';
    content: string;
};

// The rule set the AI proposes - and, once generated, has already persisted server-side. Same flat
// shape as MetricTypeCriterion, so no jsonlogic conversion is needed anywhere in this feature.
export type GeneratedScenarioRuleSpec = {
    id?: number;
    name: string;
    is_match_all: boolean;
    matching_criteria: MetricTypeCriterion[];
    interventions: number[];
};

export type ScenarioRuleAIRequest = {
    scenario: number;
    message: string;
    conversation_history: ConversationEntry[];
};

export type ScenarioRuleAIResponse = {
    assistant_message: string;
    rules: GeneratedScenarioRuleSpec[] | null;
    conversation_history: ConversationEntry[];
};
