import React from 'react';
import {
    CompareOutlined,
    FormatListBulletedOutlined,
    Settings,
} from '@mui/icons-material';
import { SvgIconProps } from '@mui/material';
import { MESSAGES } from '../domains/messages';
import { SETTINGS_READ } from './permissions';

export const menu = [
    {
        label: MESSAGES.scenariosTitle,
        key: 'snt_malaria/scenarios/list',
        permissions: [],
        icon: (props: SvgIconProps) => (
            <FormatListBulletedOutlined {...props} />
        ),
    },
    {
        label: MESSAGES.compareOptimizeTitle,
        key: 'snt_malaria/compare-optimize',
        permissions: [],
        icon: (props: SvgIconProps) => <CompareOutlined {...props} />,
        dev: true,
    },
    {
        label: MESSAGES.settingsTitle,
        key: 'snt_malaria/settings',
        permissions: [SETTINGS_READ],
        icon: (props: SvgIconProps) => <Settings {...props} />,
    },
];
