import { UseQueryResult } from 'react-query';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { getRequest } from 'Iaso/libs/Api';
import { useSnackQuery } from 'Iaso/libs/apiHooks';
import { makeUrlWithParams } from 'Iaso/libs/utils';

type UseGetOrgUnitsOptions = {
    orgUnitParentId?: number | null;
    orgUnitTypeId?: number;
    withGeometry?: boolean;
    // Requires withGeometry (asLocation) - adds each org unit's ancestor
    // chain (org_unit.parent.parent...) to the response.
    withParents?: boolean;
    enabled?: boolean;
};

export const useGetOrgUnits = ({
    orgUnitParentId,
    orgUnitTypeId,
    withGeometry = true,
    withParents = false,
    enabled = true,
}: UseGetOrgUnitsOptions = {}): UseQueryResult<OrgUnit[], Error> => {
    const params: Record<string, any> = {
        validation_status: 'VALID',
        defaultVersion: true,
        limit: 8000,
    };
    if (withGeometry) {
        params.asLocation = true;
        if (withParents) {
            params.withParents = true;
        }
    } else {
        params.smallSearch = true;
        params.order = 'name';
    }
    if (orgUnitParentId) {
        params.orgUnitParentId = orgUnitParentId;
    }
    if (orgUnitTypeId) {
        params.orgUnitTypeId = orgUnitTypeId;
    }
    const url = makeUrlWithParams('/api/orgunits/', params);
    return useSnackQuery({
        queryKey: ['orgUnits', params],
        queryFn: () => getRequest(url),
        options: {
            enabled,
            cacheTime: Infinity,
            staleTime: Infinity,
            // asLocation returns OrgUnit[] directly; smallSearch returns
            // { orgunits: OrgUnit[], ... } so we need to unwrap it.
            ...(!withGeometry && {
                select: (data: { orgunits: OrgUnit[] }) => data.orgunits ?? [],
            }),
        },
    });
};
