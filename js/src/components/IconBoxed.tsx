import React, { FC, ComponentType } from 'react';
import { Box, SvgIconProps } from '@mui/material';
import { containerBoxStyles } from '../domains/planning/components/styles';

type Props = {
    Icon: ComponentType<SvgIconProps>;
    rounded?: boolean;
};

export const IconBoxed: FC<Props> = ({ Icon, rounded = false }) => (
    <Box
        sx={
            rounded
                ? {
                      ...containerBoxStyles,
                      borderRadius: '50%',
                      aspectRatio: '1 / 1',
                      lineHeight: '0',
                  }
                : containerBoxStyles
        }
    >
        <Icon color="primary" />
    </Box>
);
