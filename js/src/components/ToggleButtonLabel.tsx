import React, { FC } from 'react';
import { Box, SvgIconProps } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';

const styles = {
    label: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
    },
    icon: { fontSize: 18 },
} satisfies SxStyles;

type Props = {
    icon: FC<SvgIconProps>;
    label: string;
};

export const ToggleButtonLabel: FC<Props> = ({ icon: Icon, label }) => (
    <Box component="span" sx={styles.label}>
        <Icon sx={styles.icon} />
        {label}
    </Box>
);
