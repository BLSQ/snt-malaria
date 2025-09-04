import React from 'react';
import { FormatListBulletedOutlined, Settings } from '@mui/icons-material';

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
        permissions: ['iaso_snt_malaria_admin'],
        icon: props => <Settings {...props} />,
    },
];
