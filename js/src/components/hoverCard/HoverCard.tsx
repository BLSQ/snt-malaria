import React, { FC, ReactNode } from 'react';
import AdsClickIcon from '@mui/icons-material/AdsClick';
import { Box, Typography } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
import { Side } from './computePlacement';

const styles = {
    card: {
        width: 272,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundColor: 'background.paper',
        border: theme => `1px solid ${theme.palette.divider}`,
        borderRadius: theme => `${theme.shape.borderRadius * 2}px`,
        boxShadow:
            '0 8px 24px rgba(31,43,61,0.14), 0 1px 3px rgba(31,43,61,0.08)',
        '& .MuiTypography-root': {
            lineHeight: 1.3,
        },
    },
    header: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1,
        padding: '12px 14px 10px',
    },
    titles: {
        flex: '1 1 auto',
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
    },
    title: {
        fontSize: theme => theme.typography.pxToRem(15),
        fontWeight: 'fontWeightMedium',
    },
    headerExtra: {
        flex: '0 1 auto',
        minWidth: 0,
    },
    body: {
        padding: '0 14px 12px',
    },
    hint: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 14px',
        backgroundColor: 'grey.100',
        color: 'text.secondary',
    },
    upwardsHint: {
        order: 1,
        borderTop: theme => `1px solid ${theme.palette.divider}`,
    },
    downwardsHint: {
        order: -1,
        borderBottom: theme => `1px solid ${theme.palette.divider}`,
    },
    leftwardsHint: {
        flexDirection: 'row-reverse',
    },
    hintIcon: {
        fontSize: 16,
    },
} satisfies SxStyles;

type Props = {
    title: string;
    subtitle?: string;
    headerExtra?: ReactNode;
    /** Short "Click to …" line, only for surfaces where a click does something. */
    hint?: string;
    /** Side the card opens towards from the pointer; the hint faces the pointer. */
    side: Side;
    children?: ReactNode;
};

export const HoverCard: FC<Props> = ({
    title,
    subtitle,
    headerExtra,
    hint,
    side,
    children,
}) => (
    <Box sx={styles.card}>
        {hint && (
            <Box
                sx={[
                    styles.hint,
                    side.up ? styles.upwardsHint : styles.downwardsHint,
                    side.left && styles.leftwardsHint,
                ]}
            >
                <AdsClickIcon sx={styles.hintIcon} />
                <Typography variant="caption">{hint}</Typography>
            </Box>
        )}
        <Box sx={styles.header}>
            <Box sx={styles.titles}>
                <Typography variant="body2" sx={styles.title}>
                    {title}
                </Typography>
                {subtitle && (
                    <Typography variant="caption" color="text.secondary">
                        {subtitle}
                    </Typography>
                )}
            </Box>
            {headerExtra && <Box sx={styles.headerExtra}>{headerExtra}</Box>}
        </Box>
        {children && <Box sx={styles.body}>{children}</Box>}
    </Box>
);
