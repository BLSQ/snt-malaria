import React from 'react';

import { RoutePath } from 'Iaso/constants/routes';

import { CompareCustomize } from '../domains/compareCustomize';
import { DataLayers } from '../domains/dataLayers';
import { InterventionSettings } from '../domains/interventions';
import { Planning } from '../domains/planning';
import { Scenarios } from '../domains/scenarios';
import { SETTINGS_READ } from './permissions';
import { baseUrls } from './urls';

export const dataLayersPath: RoutePath = {
    baseUrl: baseUrls.dataLayers,
    routerUrl: `${baseUrls.dataLayers}/*`,
    element: <DataLayers />,
    permissions: [],
};

export const planningPath: RoutePath = {
    baseUrl: baseUrls.planning,
    routerUrl: `${baseUrls.planning}/*`,
    element: <Planning />,
    permissions: [],
};

export const scenariosPath: RoutePath = {
    baseUrl: baseUrls.scenarios,
    routerUrl: `${baseUrls.scenarios}/*`,
    element: <Scenarios />,
    permissions: [],
};

export const compareCustomizePath: RoutePath = {
    baseUrl: baseUrls.compareCustomize,
    routerUrl: `${baseUrls.compareCustomize}/*`,
    element: <CompareCustomize />,
    permissions: [],
};

export const interventionsPath: RoutePath = {
    baseUrl: baseUrls.interventions,
    routerUrl: `${baseUrls.interventions}/*`,
    element: <InterventionSettings />,
    permissions: [SETTINGS_READ],
};

export const routes: RoutePath[] = [
    dataLayersPath,
    planningPath,
    scenariosPath,
    compareCustomizePath,
    interventionsPath,
];
