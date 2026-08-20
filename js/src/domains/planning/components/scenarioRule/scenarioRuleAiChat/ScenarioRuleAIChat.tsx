import React, { FC } from 'react';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { Box, Stack, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import {
    ChatMessage,
    ChatPanel,
    PendingAttachment,
    SendMessageOptions,
} from 'Iaso/components/ChatPanel/ChatPanel';
import { SxStyles } from 'Iaso/types/general';
import { CardStyled } from '../../../../../components/CardStyled';
import { IconBoxed } from '../../../../../components/IconBoxed';
import { CardScrollable } from '../../../../../components/styledComponents';
import { MESSAGES } from '../../../../messages';

type Props = {
    messages: ChatMessage[];
    isLoading: boolean;
    onSendMessage: (message: string, options?: SendMessageOptions) => void;
    pendingAttachments: PendingAttachment[];
    onAttachFiles: (files: File[]) => void;
    onRemoveAttachment: (id: string) => void;
};

// Added to ChatPanel's own flex `gap` on both rows, so the two gaps stay equal.
const EMPTY_STATE_EXTRA_GAP = 1;

const styles = {
    card: {
        // ChatPanel's user bubble hardcodes a washed-out `primary.contrastText`; pin both bubbles
        // (the only Papers under this card) to a legible color until it exposes a prop.
        '& .MuiPaper-root': {
            color: 'text.primary',
        },
    },
    // CardStyled's own header already shows the panel title, matching the rules panel's header
    // style - ChatPanel's built-in header (with its divider) would just duplicate it.
    chatHeader: { display: 'none' },
    emptyStateTitle: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.75,
        mb: EMPTY_STATE_EXTRA_GAP,
    },
    emptyStateSubhead: {
        fontWeight: 700,
        mb: EMPTY_STATE_EXTRA_GAP,
    },
    aiTitle: {
        fontWeight: 700,
        fontSize: '1.25rem',
    },
} satisfies SxStyles;

export const ScenarioRuleAIChat: FC<Props> = ({
    messages,
    isLoading,
    onSendMessage,
    pendingAttachments,
    onAttachFiles,
    onRemoveAttachment,
}) => {
    const { formatMessage } = useSafeIntl();

    return (
        <CardScrollable sx={styles.card}>
            <CardStyled
                flushContent
                header={
                    <Stack spacing={1} direction="row" alignItems="center">
                        <IconBoxed Icon={AutoAwesomeIcon} />
                        <Typography variant="h6" gutterBottom>
                            {formatMessage(MESSAGES.scenarioRuleAIChatButton)}
                        </Typography>
                    </Stack>
                }
            >
                <ChatPanel
                    messages={messages}
                    isLoading={isLoading}
                    title={formatMessage(MESSAGES.scenarioRuleAIChatButton)}
                    placeholder={formatMessage(
                        MESSAGES.scenarioRuleAIPlaceholder,
                    )}
                    sx={{ header: styles.chatHeader }}
                    emptyState={
                        <Box>
                            <Box sx={styles.emptyStateTitle}>
                                <AutoAwesomeIcon
                                    color="primary"
                                    fontSize="small"
                                />
                                <Typography sx={styles.aiTitle}>
                                    {formatMessage(
                                        MESSAGES.scenarioRuleAITitle,
                                    )}
                                </Typography>
                            </Box>
                            <Typography
                                variant="body1"
                                sx={styles.emptyStateSubhead}
                            >
                                {formatMessage(
                                    MESSAGES.scenarioRuleAIEmptyStateTitle,
                                )}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {formatMessage(
                                    MESSAGES.scenarioRuleAIEmptyStateDescription,
                                )}
                            </Typography>
                        </Box>
                    }
                    onSendMessage={onSendMessage}
                    pendingAttachments={pendingAttachments}
                    onAttachFiles={onAttachFiles}
                    onRemoveAttachment={onRemoveAttachment}
                    interpretMarkdown={true}
                />
            </CardStyled>
        </CardScrollable>
    );
};
