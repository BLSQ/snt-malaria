import React from 'react';
import {
    CompareOutlined,
    FormatListBulletedOutlined,
    Settings,
    Layers,
} from '@mui/icons-material';
import { SvgIconProps } from '@mui/material';
import { MESSAGES as dataLayersMessages } from '../domains/dataLayers/messages';
import { MESSAGES } from '../domains/messages';
import { SETTINGS_READ } from './permissions';

export const menu = [
    {
        label: dataLayersMessages.dataLayersTitle,
        key: 'snt_malaria/data-layers',
        permissions: [SETTINGS_READ],
        icon: (props: SvgIconProps) => <Layers {...props} />,
    },
    {
        label: MESSAGES.scenariosTitle,
        key: 'snt_malaria/scenarios/list',
        permissions: [],
        icon: (props: SvgIconProps) => (
            <FormatListBulletedOutlined {...props} />
        ),
    },
    {
        label: MESSAGES.compareCustomizeTitle,
        key: 'snt_malaria/compare-customize',
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
