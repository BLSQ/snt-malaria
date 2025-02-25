import {
    RouteConfig,
    extractParams,
    extractParamsConfig,
    extractUrls,
} from 'Iaso/constants/urls';
import { paginationPathParams } from 'Iaso/routing/common';

export const RouteConfigs: Record<string, RouteConfig> = {
    planning: {
        url: 'snt_malaria/planning',
        params: ['scenarioId'],
    },
    scenarios: {
        url: 'snt_malaria/scenarios/list',
        params: [...paginationPathParams],
    },
};

export type BaseUrls = {
    planning: string;
    scenarios: string;
};
export const baseUrls = extractUrls(RouteConfigs) as BaseUrls;
export const baseParams = extractParams(RouteConfigs);
export const paramsConfig = extractParamsConfig(RouteConfigs);
