import { useCallback, useState } from 'react';
import { useSafeIntl } from 'bluesquare-components';
import { ChatMessage } from 'Iaso/components/ChatPanel/ChatPanel';
import { MESSAGES } from '../messages';
import {
    ConversationEntry,
    CurrentGraph,
    GeneratedGraph,
} from './types';
import { useSendCompositeLayerAIMessage } from './useSendCompositeLayerAIMessage';

type Args = {
    // Sent with each message so the AI can iterate on the current canvas (null when empty).
    getCurrentGraph: () => CurrentGraph | null;
    onGenerate: (graph: GeneratedGraph) => void;
};

type Result = {
    messages: ChatMessage[];
    isLoading: boolean;
    sendMessage: (message: string) => void;
    reset: () => void;
};

/** Conversation state + send logic for the composite-layer AI chat, owned by the wrapper page so
 * the chat panel itself stays presentational. */
export const useCompositeLayerAIChat = ({
    getCurrentGraph,
    onGenerate,
}: Args): Result => {
    const { formatMessage } = useSafeIntl();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [conversationHistory, setConversationHistory] = useState<
        ConversationEntry[]
    >([]);
    const { mutate: sendMessage, isLoading } = useSendCompositeLayerAIMessage();

    const handleSendMessage = useCallback(
        (message: string) => {
            setMessages(prev => [
                ...prev,
                { role: 'user', content: message, id: crypto.randomUUID() },
            ]);

            sendMessage(
                {
                    message,
                    conversation_history: conversationHistory,
                    current_graph: getCurrentGraph(),
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
                        if (data.graph) {
                            onGenerate(data.graph);
                        }
                    },
                    onError: () => {
                        setMessages(prev => [
                            ...prev,
                            {
                                role: 'assistant',
                                content: formatMessage(
                                    MESSAGES.compositeLayerAIError,
                                ),
                                id: crypto.randomUUID(),
                            },
                        ]);
                    },
                },
            );
        },
        [
            conversationHistory,
            sendMessage,
            onGenerate,
            getCurrentGraph,
            formatMessage,
        ],
    );

    const reset = useCallback(() => {
        setMessages([]);
        setConversationHistory([]);
    }, []);

    return { messages, isLoading, sendMessage: handleSendMessage, reset };
};
