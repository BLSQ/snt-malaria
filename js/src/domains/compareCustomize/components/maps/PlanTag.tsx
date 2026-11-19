import React, { FC } from 'react';
import { Box, Typography } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
import { ColorDot } from '../../../../components/ColorDot';

const styles = {
    tag: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        maxWidth: 150,
        height: 24,
        padding: '0 8px',
        borderRadius: 999,
        backgroundColor: 'grey.100',
        color: 'text.primary',
    },
    label: {
        minWidth: 0,
        fontWeight: 'fontWeightMedium',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
} satisfies SxStyles;

type Props = {
    label: string;
    colors: string[];
};

export const PlanTag: FC<Props> = ({ label, colors }) => (
    <Box sx={styles.tag}>
        {colors.map(color => (
            <ColorDot key={color} color={color} />
        ))}
        <Typography variant="caption" sx={styles.label}>
            {label}
        </Typography>
    </Box>
);
