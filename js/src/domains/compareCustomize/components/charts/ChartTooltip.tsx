import React, { FC, ReactNode } from 'react';
import { Box } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';

export type ChartTooltipRow = {
    label: string;
    value: string;
    color?: string;
};

type Props = {
    title: ReactNode;
    rows: ChartTooltipRow[];
};

const styles = {
    root: {
        backgroundColor: 'common.white',
        border: '1px solid',
        borderColor: 'grey.300',
        borderRadius: 0.5,
        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
        px: 1,
        py: 0.75,
        fontSize: '0.75rem',
        lineHeight: 1.4,
    },
    title: {
        fontSize: '0.75rem',
        display: 'block',
        mb: 0.5,
    },
    row: {
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: '50%',
        flexShrink: 0,
    },
} satisfies SxStyles;

export const ChartTooltip: FC<Props> = ({ title, rows }) => (
    <Box sx={styles.root}>
        <Box component="b" sx={styles.title}>
            {title}
        </Box>
        {rows.map(row => (
            <Box key={row.label} sx={styles.row}>
                {row.color && (
                    <Box sx={{ ...styles.dot, backgroundColor: row.color }} />
                )}
                <Box component="span" sx={{ color: 'text.secondary' }}>
                    {row.label}:
                </Box>
                <Box component="span" sx={{ fontWeight: 700 }}>
                    {row.value}
                </Box>
            </Box>
        ))}
    </Box>
);
