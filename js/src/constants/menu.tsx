import React from 'react';
import CompareOutlined from '@mui/icons-material/CompareOutlined';
import FormatListBulletedOutlined from '@mui/icons-material/FormatListBulletedOutlined';
import GroupsOutlined from '@mui/icons-material/GroupsOutlined';
import HomeOutlined from '@mui/icons-material/HomeOutlined';
import Layers from '@mui/icons-material/Layers';
import PaymentsOutlined from '@mui/icons-material/PaymentsOutlined';
import TuneOutlined from '@mui/icons-material/TuneOutlined';
import VaccinesOutlined from '@mui/icons-material/VaccinesOutlined';
import type { SvgIconProps } from '@mui/material/SvgIcon/SvgIcon';
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
        label: MESSAGES.interventionsTitle,
        key: 'snt_malaria/interventions',
        permissions: [SETTINGS_READ],
        icon: (props: SvgIconProps) => <VaccinesOutlined {...props} />,
    },
    {
        label: MESSAGES.costManagementTitle,
        key: 'snt_malaria/cost-management',
        permissions: [SETTINGS_READ],
        icon: (props: SvgIconProps) => <PaymentsOutlined {...props} />,
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
