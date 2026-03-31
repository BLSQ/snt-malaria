import React from 'react';

import { RoutePath } from 'Iaso/constants/routes';
import { SHOW_DEV_FEATURES } from 'Iaso/utils/featureFlags';

import { CompareCustomize } from '../domains/compareCustomize';
import { DataLayers } from '../domains/dataLayers';
import { PlanningV2 } from '../domains/planningV2';
import { Scenarios } from '../domains/scenarios';
import { Settings } from '../domains/settings';
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
    element: <PlanningV2 />,
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
    featureFlag: SHOW_DEV_FEATURES,
};

export const settingsPath: RoutePath = {
    baseUrl: baseUrls.settings,
    routerUrl: `${baseUrls.settings}/*`,
    element: <Settings />,
    permissions: [SETTINGS_READ],
};

export const routes: RoutePath[] = [
    dataLayersPath,
    planningPath,
    scenariosPath,
    compareCustomizePath,
    settingsPath,
];
