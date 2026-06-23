import React, { FC } from 'react';
import { Box, Typography } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';

const styles = {
    root: {
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'text.secondary',
        textAlign: 'center',
        p: 2,
    },
} satisfies SxStyles;

type Props = {
    message: string;
};

export const ChartEmptyState: FC<Props> = ({ message }) => (
    <Box sx={styles.root}>
        <Typography variant="body2">{message}</Typography>
    </Box>
);
