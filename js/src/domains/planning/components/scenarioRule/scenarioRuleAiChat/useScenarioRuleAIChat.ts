import { useCallback } from 'react';
import { useSafeIntl } from 'bluesquare-components';
import { useAIChat } from '../../../../../hooks/aiChat/useAIChat';
import { MESSAGES } from '../../../../messages';
import { ScenarioRule } from '../../../types/scenarioRule';
import {
    GeneratedScenarioRuleSpec,
    ScenarioRuleAIResponse,
    ScenarioRuleRestoreRequest,
} from './types';
import {
    useRestoreScenarioRules,
    useSendScenarioRuleAIMessage,
} from './useSendScenarioRuleAIMessage';

type Args = {
    scenarioId: number;
    // The scenario's current rules, mapped straight from useGetScenarioRules. Read on every send to
    // snapshot the pre-turn rule set for a possible revert.
    rules: ScenarioRule[];
};

// The rule set as the restore endpoint expects it: same flat spec shape the AI emits, ordered
// lowest-priority-first (restore reprioritizes in list order).
const rulesToSpecs = (rules: ScenarioRule[]): GeneratedScenarioRuleSpec[] =>
    [...rules]
        .sort((a, b) => a.priority - b.priority)
        .map(rule => ({
            id: rule.id,
            name: rule.name,
            is_match_all: Boolean(rule.is_match_all),
            matching_criteria: rule.matching_criteria,
            interventions: rule.interventions,
            color: rule.color,
        }));

/** Conversation state + send/revert logic for the scenario rule AI chat. Unlike the composite layer
 * chat, there's no client-side draft to apply: the endpoint persists the generated rule set itself,
 * so a successful response just needs to land in the transcript (the rules list/map refresh
 * separately, via the query invalidation in useSendScenarioRuleAIMessage). "Revert" re-persists the
 * rule set captured just before the reverted turn through /scenario_rule_ai/restore/. */
export const useScenarioRuleAIChat = ({ scenarioId, rules }: Args) => {
    const { formatMessage } = useSafeIntl();
    const { mutate: sendMessage, isLoading } =
        useSendScenarioRuleAIMessage(scenarioId);
    const { mutateAsync: restoreRules } = useRestoreScenarioRules(scenarioId);

    return useAIChat({
        endpoint: '/api/snt_malaria/scenario_rule_ai/',
        sendMessage,
        isLoading,
        buildRequest: useCallback(
            base => ({ ...base, scenario: scenarioId }),
            [scenarioId],
        ),
        captureRevertSnapshot: useCallback(
            (): ScenarioRuleRestoreRequest => ({
                scenario: scenarioId,
                rules: rulesToSpecs(rules),
            }),
            [scenarioId, rules],
        ),
        didApplyChange: useCallback(
            (data: ScenarioRuleAIResponse) => data.rules != null,
            [],
        ),
        onRevertSnapshot: restoreRules,
        revertNoteMessage: formatMessage(MESSAGES.scenarioRuleAIRevertNote),
        errorMessage: formatMessage(MESSAGES.scenarioRuleAIError),
        uploadErrorMessage: useCallback(
            (filename: string) =>
                formatMessage(MESSAGES.scenarioRuleAIAttachmentUploadError, {
                    filename,
                }),
            [formatMessage],
        ),
    });
};
