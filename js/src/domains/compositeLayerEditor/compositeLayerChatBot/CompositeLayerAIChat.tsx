import React, { FC, useCallback, useState } from 'react';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { Box, Card, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { ChatMessage, ChatPanel } from 'Iaso/components/ChatPanel/ChatPanel';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../messages';
import { ConversationEntry, GeneratedGraph } from './types';
import { useSendCompositeLayerAIMessage } from './useSendCompositeLayerAIMessage';

type Props = {
    onGenerate: (graph: GeneratedGraph) => void;
};

const chatStyles = {
    header: {
        pb: 0,
        minHeight: '65px',
        display: 'flex',
        alignContent: 'center',
        border: 'none',
        ' p': { fontSize: '1.25rem', ml: 0.5 },
    },
} satisfies SxStyles;

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
            <ChatPanel
                messages={messages}
                isLoading={isLoading}
                title={formatMessage(MESSAGES.compositeLayerAITitle)}
                titleIcon={<AutoAwesomeIcon color="primary" fontSize="small" />}
                placeholder={formatMessage(
                    MESSAGES.compositeLayerAIPlaceholder,
                )}
                sx={chatStyles}
                emptyState={
                    <Box>
                        <Typography variant="body1" sx={{ fontWeight: 700 }}>
                            {formatMessage(
                                MESSAGES.compositeLayerAIEmptyStateTitle,
                            )}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {formatMessage(
                                MESSAGES.compositeLayerAIEmptyStateDescription,
                            )}
                        </Typography>
                    </Box>
                }
                onSendMessage={handleSendMessage}
                interpretMarkdown={true}
            />
        </Card>
    );
};
