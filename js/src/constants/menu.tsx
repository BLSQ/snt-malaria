import React from 'react';
import {
    CompareOutlined,
    FormatListBulletedOutlined,
    GroupsOutlined,
    HomeOutlined,
    Layers,
    TuneOutlined,
} from '@mui/icons-material';
import { SvgIconProps } from '@mui/material';
import { IMPACT } from 'Iaso/utils/featureFlags';
import { MESSAGES as contributorsMessages } from '../domains/contributors/messages';
import { MESSAGES as dataLayersMessages } from '../domains/dataLayers/messages';
import { MESSAGES as homeMessages } from '../domains/home/messages';
import { MESSAGES } from '../domains/messages';
import { SETTINGS_READ } from './permissions';

export const menu = [
    {
        label: homeMessages.title,
        key: 'snt_malaria/home',
        permissions: [],
        icon: (props: SvgIconProps) => <HomeOutlined {...props} />,
    },
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
        featureFlag: IMPACT,
        icon: (props: SvgIconProps) => <CompareOutlined {...props} />,
    },
    {
        label: MESSAGES.settingsTitle,
        key: 'snt_malaria/settings',
        permissions: [SETTINGS_READ],
        icon: (props: SvgIconProps) => <TuneOutlined {...props} />,
    },
    {
        label: contributorsMessages.title,
        key: 'snt_malaria/contributors',
        permissions: [],
        icon: (props: SvgIconProps) => <GroupsOutlined {...props} />,
    },
];
