import React, { FC } from 'react';
import { Box } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';

const styles = {
    dot: {
        flex: '0 0 auto',
        borderRadius: '50%',
    },
} satisfies SxStyles;

type Props = {
    color: string;
    size?: number;
};

export const ColorDot: FC<Props> = ({ color, size = 8 }) => (
    <Box
        component="span"
        sx={[styles.dot, { width: size, height: size, backgroundColor: color }]}
    />
);
