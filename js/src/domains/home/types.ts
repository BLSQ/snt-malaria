import { ComponentType } from 'react';
import type { SvgIconProps } from '@mui/material/SvgIcon/SvgIcon';
import { IntlMessage } from 'bluesquare-components';

export type HomeCardConfig = {
    id: string;
    Icon: ComponentType<SvgIconProps>;
    title: IntlMessage;
    caption: IntlMessage;
    to: string;
    // Empty means visible to every user.
    permissions: string[];
    featureFlag?: string;
};
