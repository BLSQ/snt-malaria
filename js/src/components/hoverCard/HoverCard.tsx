import React, { FC, ReactNode } from 'react';
import { Box, Typography } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';

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
} satisfies SxStyles;

type Props = {
    title: string;
    subtitle?: string;
    headerExtra?: ReactNode;
    children?: ReactNode;
};

export const HoverCard: FC<Props> = ({
    title,
    subtitle,
    headerExtra,
    children,
}) => (
    <Box sx={styles.card}>
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
