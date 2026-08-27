import React, { FC } from 'react';
import { Box, Typography } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';

const styles = {
    root: {
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        backgroundColor: 'grey.100',
        borderRadius: 3,
        px: 1.25,
        py: 0.5,
        whiteSpace: 'nowrap',
        flexShrink: 0,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: '50%',
        flexShrink: 0,
    },
    label: {
        fontWeight: 600,
        fontSize: '0.75rem',
        color: 'text.secondary',
    },
} satisfies SxStyles;

type Props = {
    color: string;
    label: string;
};

export const SlotTag: FC<Props> = ({ color, label }) => (
    <Box sx={styles.root}>
        <Box sx={[styles.dot, { backgroundColor: color }]} />
        <Typography sx={styles.label}>{label}</Typography>
    </Box>
);
