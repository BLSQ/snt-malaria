import {
    AIChatRequest,
    AIChatResponse,
} from '../../../../../hooks/aiChat/types';
import { MetricTypeCriterion } from '../../../types/scenarioRule';

// The rule set the AI proposes - and, once generated, has already persisted server-side. Same flat
// shape as MetricTypeCriterion, so no jsonlogic conversion is needed anywhere in this feature.
export type GeneratedScenarioRuleSpec = {
    id?: number;
    name: string;
    is_match_all: boolean;
    matching_criteria: MetricTypeCriterion[];
    interventions: number[];
    color?: string;
};

export type ScenarioRuleAIRequest = AIChatRequest & {
    scenario: number;
};

export type ScenarioRuleAIResponse = AIChatResponse & {
    rules: GeneratedScenarioRuleSpec[] | null;
};

// Sent to POST /scenario_rule_ai/restore/ when the user reverts an AI change: the complete rule set
// as it stood just before that turn. Re-persisted through the same pipeline as a generated set.
export type ScenarioRuleRestoreRequest = {
    scenario: number;
    rules: GeneratedScenarioRuleSpec[];
};

export type ScenarioRuleRestoreResponse = {
    rules: GeneratedScenarioRuleSpec[];
};
