import {
    RouteConfig,
    extractParams,
    extractParamsConfig,
    extractUrls,
} from '../../../../../hat/assets/js/apps/Iaso/constants/urls';

export const PLANNING_BASE_URL = 'snt_malaria/planning';

export const RouteConfigs: Record<string, RouteConfig> = {
    planning: {
        url: PLANNING_BASE_URL,
        params: [],
    },
};

export type BaseUrls = {
    planning: string;
};
export const baseUrls = extractUrls(RouteConfigs) as BaseUrls;
export const baseParams = extractParams(RouteConfigs);
export const paramsConfig = extractParamsConfig(RouteConfigs);
