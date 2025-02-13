import React from 'react';
import { RoutePath } from '../../../../../hat/assets/js/apps/Iaso/constants/routes';
import { Planning } from '../domains/planning';
import { baseUrls } from './urls';

export const planningPath: RoutePath = {
    baseUrl: baseUrls.planning,
    routerUrl: `${baseUrls.planning}/*`,
    element: <Planning />,
    // isRootUrl: true,
    // allowAnonymous: true,
    permissions: [],
};

export const routes: RoutePath[] = [planningPath];
