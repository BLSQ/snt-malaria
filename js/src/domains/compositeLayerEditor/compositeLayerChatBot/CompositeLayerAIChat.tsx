import React, { FC } from 'react';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { Box, Card, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { ChatMessage, ChatPanel } from 'Iaso/components/ChatPanel/ChatPanel';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../messages';

type Props = {
    messages: ChatMessage[];
    isLoading: boolean;
    onSendMessage: (message: string) => void;
};

const chatStyles = {
    // The node library's tabs already say "AI Mode" - no need for ChatPanel's own sticky title
    // row on top of that. Its title text is shown once instead, centered above the empty-state
    // copy (see `emptyState` below).
    header: { display: 'none' },
} satisfies SxStyles;

const emptyStateStyles = {
    title: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.75,
        mb: 1,
    },
} satisfies SxStyles;

export const CompositeLayerAIChat: FC<Props> = ({
    messages,
    isLoading,
    onSendMessage,
}) => {
    const { formatMessage } = useSafeIntl();

    return (
        <Card
            elevation={0}
            sx={{
                height: '100%',
                flexGrow: 1,
                display: 'flex',
                flexDirection: 'column',
                // ChatPanel's user bubble hardcodes a washed-out `primary.contrastText`; pin both
                // bubbles (the only Papers under this Card) to a legible color until it exposes a prop.
                '& .MuiPaper-root': {
                    color: 'text.primary',
                },
            }}
        >
            <ChatPanel
                messages={messages}
                isLoading={isLoading}
                title={formatMessage(MESSAGES.compositeLayerAITitle)}
                placeholder={formatMessage(
                    MESSAGES.compositeLayerAIPlaceholder,
                )}
                sx={chatStyles}
                emptyState={
                    <Box>
                        <Box sx={emptyStateStyles.title}>
                            <AutoAwesomeIcon
                                color="primary"
                                fontSize="small"
                            />
                            <Typography
                                sx={{ fontWeight: 700, fontSize: '1.25rem' }}
                            >
                                {formatMessage(MESSAGES.compositeLayerAITitle)}
                            </Typography>
                        </Box>
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
                onSendMessage={onSendMessage}
                interpretMarkdown={true}
            />
        </Card>
    );
};
