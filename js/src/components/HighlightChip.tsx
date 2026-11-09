import React, { FC } from 'react';
import { Box } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { SxStyles } from 'Iaso/types/general';
import { overrideColors } from '../constants/overrideColors';
import { ColorDot } from './ColorDot';

const styles = {
    chip: {
        flex: '0 0 auto',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        height: 22,
        px: 1,
        borderRadius: 999,
        typography: 'caption',
        fontWeight: 'medium',
        whiteSpace: 'nowrap',
    },
    highlightChip: {
        backgroundColor: overrideColors.overriddenBackground,
        color: overrideColors.overriddenText,
    },
    outlinedChip: {
        border: 1,
        borderColor: theme => alpha(theme.palette.text.primary, 0.23),
        color: 'text.primary',
        fontWeight: 'regular',
    },
} satisfies SxStyles;

type Props = {
    label: string;
    variant?: 'highlight' | 'outlined';
    dotColor?: string;
};

export const HighlightChip: FC<Props> = ({
    label,
    variant = 'highlight',
    dotColor,
}) => (
    <Box
        component="span"
        sx={[
            styles.chip,
            variant === 'outlined' ? styles.outlinedChip : styles.highlightChip,
        ]}
    >
        {dotColor && <ColorDot color={dotColor} />}
        {label}
    </Box>
);
