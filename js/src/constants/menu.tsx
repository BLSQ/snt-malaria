import React from 'react';
import {
    CompareOutlined,
    FormatListBulletedOutlined,
    Layers,
    SettingsInputComponent,
} from '@mui/icons-material';
import { SvgIconProps } from '@mui/material';
import { MESSAGES as dataLayersMessages } from '../domains/dataLayers/messages';
import { MESSAGES } from '../domains/messages';
import { SCENARIO_BASIC_WRITE, SETTINGS_READ } from './permissions';

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
        permissions: [SCENARIO_BASIC_WRITE],
        icon: (props: SvgIconProps) => (
            <FormatListBulletedOutlined {...props} />
        ),
    },
    {
        label: MESSAGES.compareCustomizeTitle,
        key: 'snt_malaria/compare-customize',
        permissions: [SCENARIO_BASIC_WRITE],
        icon: (props: SvgIconProps) => <CompareOutlined {...props} />,
    },
    {
        label: MESSAGES.interventionsTitle,
        key: 'snt_malaria/interventions',
        permissions: [SETTINGS_READ],
        icon: (props: SvgIconProps) => <SettingsInputComponent {...props} />,
    },
];
