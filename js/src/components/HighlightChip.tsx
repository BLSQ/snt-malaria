import React, { FC } from 'react';
import { Box } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
import { overrideColors } from '../constants/overrideColors';

const styles = {
    chip: {
        flex: '0 0 auto',
        display: 'inline-flex',
        alignItems: 'center',
        height: 22,
        px: 1,
        borderRadius: 999,
        backgroundColor: overrideColors.overriddenBackground,
        color: overrideColors.overriddenText,
        typography: 'caption',
        fontWeight: 'medium',
        whiteSpace: 'nowrap',
    },
} satisfies SxStyles;

type Props = {
    label: string;
};

export const HighlightChip: FC<Props> = ({ label }) => (
    <Box component="span" sx={styles.chip}>
        {label}
    </Box>
);
