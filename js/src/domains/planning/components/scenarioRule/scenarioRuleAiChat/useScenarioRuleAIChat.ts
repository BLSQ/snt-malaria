import { useCallback, useState } from 'react';
import { useSafeIntl } from 'bluesquare-components';
import { ChatMessage } from 'Iaso/components/ChatPanel/ChatPanel';
import { MESSAGES } from '../../../../messages';
import { ConversationEntry } from './types';
import { useSendScenarioRuleAIMessage } from './useSendScenarioRuleAIMessage';

type Args = {
    scenarioId: number;
};

type Result = {
    messages: ChatMessage[];
    isLoading: boolean;
    sendMessage: (message: string) => void;
};

/** Conversation state + send logic for the scenario rule AI chat. Unlike the composite layer chat,
 * there's no client-side draft to track: the endpoint persists the generated rule set itself, so a
 * successful response just needs to land in the transcript (the rules list/map refresh separately,
 * via the query invalidation in useSendScenarioRuleAIMessage). */
export const useScenarioRuleAIChat = ({ scenarioId }: Args): Result => {
    const { formatMessage } = useSafeIntl();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [conversationHistory, setConversationHistory] = useState<
        ConversationEntry[]
    >([]);
    const { mutate: sendMessage, isLoading } =
        useSendScenarioRuleAIMessage(scenarioId);

    const handleSendMessage = useCallback(
        (message: string) => {
            setMessages(prev => [
                ...prev,
                { role: 'user', content: message, id: crypto.randomUUID() },
            ]);

            sendMessage(
                {
                    scenario: scenarioId,
                    message,
                    conversation_history: conversationHistory,
                },
                {
                    onSuccess: data => {
                        setMessages(prev => [
                            ...prev,
                            {
                                role: 'assistant',
                                content: data.assistant_message,
                                id: crypto.randomUUID(),
                            },
                        ]);
                        setConversationHistory(data.conversation_history);
                    },
                    onError: () => {
                        setMessages(prev => [
                            ...prev,
                            {
                                role: 'assistant',
                                content: formatMessage(
                                    MESSAGES.scenarioRuleAIError,
                                ),
                                id: crypto.randomUUID(),
                            },
                        ]);
                    },
                },
            );
        },
        [conversationHistory, sendMessage, scenarioId, formatMessage],
    );

    return { messages, isLoading, sendMessage: handleSendMessage };
};
