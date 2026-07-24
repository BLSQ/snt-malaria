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
    header: {
        pb: 0,
        minHeight: '65px',
        display: 'flex',
        alignContent: 'center',
        border: 'none',
        ' p': { fontSize: '1.25rem', ml: 0.5 },
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
                onSendMessage={onSendMessage}
                interpretMarkdown={true}
            />
        </Card>
    );
};
