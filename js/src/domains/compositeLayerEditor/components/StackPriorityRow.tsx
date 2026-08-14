import React, { FC } from 'react';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import { Box, IconButton } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../messages';

const styles = {
    row: {
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        border: theme => `1px solid ${theme.palette.divider}`,
        borderRadius: '6px',
        padding: theme => theme.spacing(0.25, 0.5),
    },
    rank: {
        minWidth: 16,
        textAlign: 'center',
        color: 'text.secondary',
        fontSize: 12,
    },
    portLabel: {
        flex: 1,
        fontSize: 13,
    },
} satisfies SxStyles;

type Props = {
    port: string;
    /** 1-based priority rank, for display only. */
    rank: number;
    isFirst: boolean;
    isLast: boolean;
    onMoveUp: () => void;
    onMoveDown: () => void;
};

/** One reorderable row of `StackPriorityControl`'s priority list. */
export const StackPriorityRow: FC<Props> = ({
    port,
    rank,
    isFirst,
    isLast,
    onMoveUp,
    onMoveDown,
}) => {
    const { formatMessage } = useSafeIntl();

    return (
        <Box sx={styles.row}>
            <Box component="span" sx={styles.rank}>
                {rank}
            </Box>
            <Box component="span" sx={styles.portLabel}>
                {port}
            </Box>
            <IconButton
                size="small"
                disabled={isFirst}
                onClick={onMoveUp}
                aria-label={formatMessage(MESSAGES.stackMoveUp)}
            >
                <ArrowUpwardIcon fontSize="inherit" />
            </IconButton>
            <IconButton
                size="small"
                disabled={isLast}
                onClick={onMoveDown}
                aria-label={formatMessage(MESSAGES.stackMoveDown)}
            >
                <ArrowDownwardIcon fontSize="inherit" />
            </IconButton>
        </Box>
    );
};
