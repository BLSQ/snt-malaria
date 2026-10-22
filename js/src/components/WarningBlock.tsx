import React, { FC, ReactNode } from 'react';
import { Box, SxProps, Theme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { SxStyles } from 'Iaso/types/general';

const styles = {
    block: {
        px: 1.5,
        py: 1.25,
        borderRadius: 2,
        backgroundColor: theme => alpha(theme.palette.text.primary, 0.04),
    },
} satisfies SxStyles;

type Props = {
    sx?: SxProps<Theme>;
    children: ReactNode;
};

export const WarningBlock: FC<Props> = ({ sx, children }) => (
    <Box sx={[styles.block, ...(Array.isArray(sx) ? sx : [sx])]}>
        {children}
    </Box>
);
