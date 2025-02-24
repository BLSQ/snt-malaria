import React from 'react';
import { FormatListBulletedOutlined } from '@mui/icons-material';

export const menu = [
    {
        label: 'Scenarios',
        key: 'snt_malaria/scenarios/list',
        permissions: [],
        icon: props => <FormatListBulletedOutlined {...props} />,
    },
];
