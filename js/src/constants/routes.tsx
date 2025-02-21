import React from 'react';

import { RoutePath } from 'Iaso/constants/routes';

import { Planning } from '../domains/planning';
import { Scenarios } from '../domains/scenarios';
import { baseUrls } from './urls';

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

export const routes: RoutePath[] = [planningPath, scenariosPath];
