import { useMemo } from 'react';
import { UseQueryResult } from 'react-query';
import { useGetOrgUnitTypes } from '../../../../../configureAccount/hooks/useGetOrgUnitTypes';

// The org unit list endpoint the tree is built from (asLocation/withParents) only ever carries
// org_unit_type_id - never a name - for ancestor nodes, so the tree resolves type names itself
// from this id -> name map, derived from the same dropdown endpoint/query configureAccount
// already fetches (sharing its cache instead of re-fetching independently).
export const useOrgUnitTypeNames = (): UseQueryResult<
    Map<number, string>,
    Error
> => {
    const query = useGetOrgUnitTypes(true);
    const data = useMemo(
        () =>
            query.data
                ? new Map(
                      query.data.map(option => [option.value, option.label]),
                  )
                : undefined,
        [query.data],
    );
    return { ...query, data } as UseQueryResult<Map<number, string>, Error>;
};
