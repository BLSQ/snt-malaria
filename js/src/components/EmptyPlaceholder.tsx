import React, { FC } from 'react';
import { Box, SvgIconProps, Typography } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
import { overrideColors } from '../constants/overrideColors';

const styles = {
    root: {
        flex: '1 1 auto',
        height: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        p: 2,
        textAlign: 'center',
        border: `1px dashed ${overrideColors.inputBorder}`,
        borderRadius: 2,
    },
    icon: { fontSize: 48, color: 'text.disabled' },
    message: { maxWidth: 360, color: 'text.secondary' },
} satisfies SxStyles;

type Props = {
    icon: FC<SvgIconProps>;
    message: string;
};

export const EmptyPlaceholder: FC<Props> = ({ icon: Icon, message }) => (
    <Box sx={styles.root}>
        <Icon sx={styles.icon} />
        <Typography variant="body2" sx={styles.message}>
            {message}
        </Typography>
    </Box>
);
