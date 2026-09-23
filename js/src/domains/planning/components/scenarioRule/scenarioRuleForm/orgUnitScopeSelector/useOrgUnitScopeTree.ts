import { useMemo } from 'react';
import { UseQueryResult } from 'react-query';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { useGetOrgUnits } from '../../../../hooks/useGetOrgUnits';
import { buildScopeTree } from './scopeTreeUtils';
import { ScopeTree } from './types';
import { useOrgUnitTypeNames } from './useOrgUnitTypeNames';

type UseOrgUnitScopeTreeResult = {
    tree: ScopeTree | undefined;
    isLoading: boolean;
    isError: boolean;
    refetch: UseQueryResult<OrgUnit[], Error>['refetch'];
};

// Fetches every org unit at the account's configured intervention level,
// each carrying its full ancestor chain (withParents), and builds the whole
// navigable pyramid (leaves + ancestors, deduplicated) from that single
// request. Intervention-level counts are bounded (low hundreds for a
// country), so this is far simpler and more robust than aggregating counts
// over a lazily/partially-loaded tree, while still only ever holding the
// org units this selector actually cares about in memory - never the
// full pyramid down to facility level.
export const useOrgUnitScopeTree = (
    interventionTypeId?: number,
): UseOrgUnitScopeTreeResult => {
    const {
        data: orgUnits,
        isLoading: isLoadingOrgUnits,
        isError: isOrgUnitsError,
        refetch,
    } = useGetOrgUnits({
        orgUnitTypeId: interventionTypeId,
        withParents: true,
        enabled: !!interventionTypeId,
    });
    const {
        data: orgUnitTypeNames,
        isLoading: isLoadingOrgUnitTypeNames,
        isError: isOrgUnitTypeNamesError,
    } = useOrgUnitTypeNames();

    const tree = useMemo(
        () =>
            orgUnits && orgUnitTypeNames
                ? buildScopeTree(orgUnits, orgUnitTypeNames)
                : undefined,
        [orgUnits, orgUnitTypeNames],
    );

    return {
        tree,
        isLoading: isLoadingOrgUnits || isLoadingOrgUnitTypeNames,
        isError: isOrgUnitsError || isOrgUnitTypeNamesError,
        refetch,
    };
};
