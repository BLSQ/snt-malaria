import React, { FC, ComponentType } from 'react';
import { Box, SvgIconProps } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
import { containerBoxStyles } from '../domains/planning/components/styles';

type Props = {
    Icon: ComponentType<SvgIconProps>;
    rounded?: boolean;
};

const styles = {
    box: {
        ...containerBoxStyles,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        aspectRatio: '1 / 1',
        flexShrink: 0,
        lineHeight: 0,
    },
    rounded: {
        borderRadius: '50%',
    },
} satisfies SxStyles;

export const IconBoxed: FC<Props> = ({ Icon, rounded = false }) => (
    <Box sx={[styles.box, rounded && styles.rounded]}>
        <Icon color="primary" />
    </Box>
);
