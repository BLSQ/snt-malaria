import {
    RouteConfig,
    extractParams,
    extractParamsConfig,
    extractUrls,
} from 'Iaso/constants/urls';
import { paginationPathParams } from 'Iaso/routing/common';

export const RouteConfigs: Record<string, RouteConfig> = {
    dataLayers: {
        url: 'snt_malaria/data-layers',
        params: [],
    },
    planning: {
        url: 'snt_malaria/planning',
        params: ['scenarioId', 'displayOrgUnitId'],
    },
    compareCustomize: {
        url: 'snt_malaria/compare-customize',
        params: [],
    },
    scenarios: {
        url: 'snt_malaria/scenarios/list',
        params: [...paginationPathParams],
    },
    settings: {
        url: 'snt_malaria/settings',
        params: [],
    },
    interventions: {
        url: 'snt_malaria/interventions',
        params: [],
    },
};

export type BaseUrls = {
    dataLayers: string;
    planning: string;
    compareCustomize: string;
    scenarios: string;
    settings: string;
    interventions: string;
};
export const baseUrls = extractUrls(RouteConfigs) as BaseUrls;
export const baseParams = extractParams(RouteConfigs);
export const paramsConfig = extractParamsConfig(RouteConfigs);
