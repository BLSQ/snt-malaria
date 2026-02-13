import React from 'react';
import { FormatListBulletedOutlined, Settings } from '@mui/icons-material';
import { SETTINGS_READ } from './permissions';

export const menu = [
    {
        label: 'Scenarios',
        key: 'snt_malaria/scenarios/list',
        permissions: [],
        icon: props => <FormatListBulletedOutlined {...props} />,
    },
    {
        label: 'Settings',
        key: 'snt_malaria/settings',
        permissions: [SETTINGS_READ],
        icon: props => <Settings {...props} />,
    },
];
