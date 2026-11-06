import { UseQueryResult } from 'react-query';
import { getRequest } from 'Iaso/libs/Api';
import { useSnackQuery } from 'Iaso/libs/apiHooks';
import {
    ORG_UNIT_IDS_API_PARAM,
    serializeOrgUnitIds,
} from '../../../utils/orgUnitIdsParam';
import { ScenarioImpactMetrics } from '../types';

export const useGetScenarioImpact = (
    scenarioId?: number,
    yearFrom?: number,
    yearTo?: number,
    ageGroup?: string,
    enabledOverride?: boolean,
    orgUnitIds: number[] = [],
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
    const serializedOrgUnitIds = serializeOrgUnitIds(orgUnitIds);
    if (serializedOrgUnitIds) {
        params.set(ORG_UNIT_IDS_API_PARAM, serializedOrgUnitIds);
    }

    return useSnackQuery({
        queryKey: [
            'impact',
            scenarioId,
            yearFrom,
            yearTo,
            ageGroup,
            serializedOrgUnitIds,
        ],
        queryFn: () =>
            getRequest(`/api/snt_malaria/impact/?${params.toString()}`),
        options: {
            staleTime: Infinity,
            cacheTime: Infinity,
            enabled:
                (enabledOverride ?? true) &&
                Boolean(scenarioId) &&
                Boolean(ageGroup),
            keepPreviousData: true,
            retry: false,
            refetchOnWindowFocus: false,
        },
        ignoreErrorCodes: [404],
    });
};
