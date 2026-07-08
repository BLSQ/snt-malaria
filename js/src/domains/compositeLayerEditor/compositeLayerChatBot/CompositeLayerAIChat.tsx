import React, { FC, useCallback, useState } from 'react';
import { Card } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { ChatMessage, ChatPanel } from 'Iaso/components/chat/ChatPanel';
import { CardStyled } from '../../../components/CardStyled';
import { MESSAGES } from '../messages';
import { ConversationEntry, GeneratedGraph } from './types';
import { useSendCompositeLayerAIMessage } from './useSendCompositeLayerAIMessage';

type Props = {
    onGenerate: (graph: GeneratedGraph) => void;
};

export const CompositeLayerAIChat: FC<Props> = ({ onGenerate }) => {
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
                { message, conversation_history: conversationHistory },
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
        [conversationHistory, sendMessage, onGenerate, formatMessage],
    );

    return (
        <Card
            sx={{
                height: '100%',
                flexGrow: 1,
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <CardStyled header={formatMessage(MESSAGES.compositeLayerAITitle)}>
                <ChatPanel
                    messages={messages}
                    isLoading={isLoading}
                    placeholder={formatMessage(
                        MESSAGES.compositeLayerAIPlaceholder,
                    )}
                    onSendMessage={handleSendMessage}
                />
            </CardStyled>
        </Card>
    );
};
