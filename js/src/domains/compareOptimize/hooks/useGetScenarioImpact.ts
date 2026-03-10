import { UseQueryResult } from 'react-query';
import { getRequest } from 'Iaso/libs/Api';
import { useSnackQuery } from 'Iaso/libs/apiHooks';
import { ScenarioImpactMetrics } from '../types';

export const useGetScenarioImpact = (
    scenarioId?: number,
    yearFrom?: number,
    yearTo?: number,
    ageGroup?: string,
    enabledOverride?: boolean,
): UseQueryResult<ScenarioImpactMetrics, Error> => {
    const params = new URLSearchParams();
    if (scenarioId) {
        params.set('scenario_id', String(scenarioId));
    }
    if (yearFrom !== undefined) {
        params.set('year_from', String(yearFrom));
    }
    if (yearTo !== undefined) {
        params.set('year_to', String(yearTo));
    }
    if (ageGroup !== undefined) {
        params.set('age_group', ageGroup);
    }

    return useSnackQuery({
        queryKey: ['impact', scenarioId, yearFrom, yearTo, ageGroup],
        queryFn: () =>
            getRequest(`/api/snt_malaria/impact/?${params.toString()}`),
        options: {
            cacheTime: Infinity,
            enabled:
                (enabledOverride ?? true) &&
                Boolean(scenarioId) &&
                Boolean(ageGroup),
            retry: false,
            refetchOnWindowFocus: false,
        },
        ignoreErrorCodes: [404],
    });
};
