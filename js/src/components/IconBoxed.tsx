import React, { FC, ComponentType } from 'react';
import { Box, SvgIconProps } from '@mui/material';
import { containerBoxStyles } from '../domains/planning/components/styles';

type Props = {
    Icon: ComponentType<SvgIconProps>;
};

export const IconBoxed: FC<Props> = ({ Icon }) => (
    <Box sx={containerBoxStyles}>
        <Icon color="primary" />
    </Box>
);
