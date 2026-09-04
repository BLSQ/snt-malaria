import React, { FC } from 'react';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { Box, Card, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import {
    ChatMessage,
    ChatPanel,
    PendingAttachment,
    SendMessageOptions,
} from 'Iaso/components/ChatPanel/ChatPanel';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../messages';

type Props = {
    messages: ChatMessage[];
    isLoading: boolean;
    onSendMessage: (message: string, options?: SendMessageOptions) => void;
    onRevert: (messageId: string) => void;
    pendingAttachments: PendingAttachment[];
    onAttachFiles: (files: File[]) => void;
    onRemoveAttachment: (id: string) => void;
};

const chatStyles = {
    // The sidebar tabs already say "AI Mode"; the title is shown in the empty state instead.
    header: { display: 'none' },
} satisfies SxStyles;

// Added to ChatPanel's own flex `gap` on both rows, so the two gaps stay equal.
const EMPTY_STATE_EXTRA_GAP = 1;

const emptyStateStyles = {
    title: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.75,
        mb: EMPTY_STATE_EXTRA_GAP,
    },
    subhead: {
        fontWeight: 700,
        mb: EMPTY_STATE_EXTRA_GAP,
    },
} satisfies SxStyles;

export const CompositeLayerAIChat: FC<Props> = ({
    messages,
    isLoading,
    onSendMessage,
    onRevert,
    pendingAttachments,
    onAttachFiles,
    onRemoveAttachment,
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
                            <AutoAwesomeIcon color="primary" fontSize="small" />
                            <Typography
                                sx={{ fontWeight: 700, fontSize: '1.25rem' }}
                            >
                                {formatMessage(MESSAGES.compositeLayerAITitle)}
                            </Typography>
                        </Box>
                        <Typography
                            variant="body1"
                            sx={emptyStateStyles.subhead}
                        >
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
                onRevert={onRevert}
                interpretMarkdown={true}
                pendingAttachments={pendingAttachments}
                onAttachFiles={onAttachFiles}
                onRemoveAttachment={onRemoveAttachment}
            />
        </Card>
    );
};
