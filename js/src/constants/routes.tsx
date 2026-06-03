import React from 'react';

import { AnonymousRoutePath, RoutePath } from 'Iaso/constants/routes';

import { CompareCustomize } from '../domains/compareCustomize';
import { ConfigureAccount } from '../domains/configureAccount';
import { DataLayers } from '../domains/dataLayers';
import { Planning } from '../domains/planning';
import { Scenarios } from '../domains/scenarios';
import { Settings } from '../domains/settings';
import { SetupAccount } from '../domains/setupAccount';
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

export const settingsPath: RoutePath = {
    baseUrl: baseUrls.settings,
    routerUrl: `${baseUrls.settings}/*`,
    element: <Settings />,
    permissions: [SETTINGS_READ],
};

// Anonymous public form. Gated server-side by ENABLE_PUBLIC_ACCOUNT_SETUP.
export const setupAccountPath: AnonymousRoutePath = {
    baseUrl: baseUrls.setupAccount,
    routerUrl: `${baseUrls.setupAccount}/*`,
    element: <SetupAccount />,
    isRootUrl: true,
    allowAnonymous: true,
    useDashboard: false,
};

// Post-login wizard that finishes the account setup (org-unit types, budget).
export const configureAccountPath: RoutePath = {
    baseUrl: baseUrls.configureAccount,
    routerUrl: `${baseUrls.configureAccount}/*`,
    element: <ConfigureAccount />,
    permissions: [],
};

export const routes: (RoutePath | AnonymousRoutePath)[] = [
    dataLayersPath,
    planningPath,
    scenariosPath,
    compareCustomizePath,
    settingsPath,
    setupAccountPath,
    configureAccountPath,
];
