import { useCallback } from 'react';
import { useSafeIntl } from 'bluesquare-components';
import { useAIChat } from '../../../../../hooks/aiChat/useAIChat';
import { MESSAGES } from '../../../../messages';
import { useSendScenarioRuleAIMessage } from './useSendScenarioRuleAIMessage';

type Args = {
    scenarioId: number;
};

/** Conversation state + send logic for the scenario rule AI chat. Unlike the composite layer chat,
 * there's no client-side draft to apply: the endpoint persists the generated rule set itself, so a
 * successful response just needs to land in the transcript (the rules list/map refresh separately,
 * via the query invalidation in useSendScenarioRuleAIMessage). */
export const useScenarioRuleAIChat = ({ scenarioId }: Args) => {
    const { formatMessage } = useSafeIntl();
    const { mutate: sendMessage, isLoading } =
        useSendScenarioRuleAIMessage(scenarioId);

    return useAIChat({
        endpoint: '/api/snt_malaria/scenario_rule_ai/',
        sendMessage,
        isLoading,
        buildRequest: useCallback(
            base => ({ ...base, scenario: scenarioId }),
            [scenarioId],
        ),
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
