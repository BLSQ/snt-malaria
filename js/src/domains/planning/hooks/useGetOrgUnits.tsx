import { UseQueryResult } from 'react-query';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { getRequest } from 'Iaso/libs/Api';
import { useSnackQuery } from 'Iaso/libs/apiHooks';
import { makeUrlWithParams } from 'Iaso/libs/utils';

export const useGetOrgUnits = (
    orgUnitParentId?: number | null,
): UseQueryResult<OrgUnit[], Error> => {
    const params: Record<string, any> = {
        validation_status: 'VALID',
        defaultVersion: true,
        asLocation: true,
        limit: 8000,
    };
    if (orgUnitParentId) {
        params.orgUnitParentId = orgUnitParentId;
    }
    const url = makeUrlWithParams('/api/orgunits/', params);
    return useSnackQuery({
        queryKey: ['orgUnits', params],
        queryFn: () => getRequest(url),
        options: {
            cacheTime: Infinity, // disable auto fetch on cache expiration
        },
    });
};

type OrgUnitsResponse = {
    orgunits: OrgUnit[];
};

export const useGetOrgUnitsByType = (
    orgUnitTypeId: number | null,
): UseQueryResult<OrgUnit[], Error> => {
    const params: Record<string, any> = {
        validation_status: 'VALID',
        defaultVersion: true,
        limit: 8000,
    };
    if (orgUnitTypeId) {
        params.orgUnitTypeId = orgUnitTypeId;
    }
    const url = makeUrlWithParams('/api/orgunits/', params);
    return useSnackQuery({
        queryKey: ['orgUnitsByType', params],
        queryFn: () => getRequest(url) as Promise<OrgUnitsResponse>,
        options: {
            enabled: orgUnitTypeId !== null,
            cacheTime: Infinity,
            select: (data: OrgUnitsResponse) => data.orgunits ?? [],
        },
    });
};
