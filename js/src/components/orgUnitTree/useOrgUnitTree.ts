import { useMemo } from 'react';
import { UseQueryResult } from 'react-query';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { useGetOrgUnits } from '../../domains/planning/hooks/useGetOrgUnits';
import { buildOrgUnitTree } from './orgUnitTreeUtils';
import { OrgUnitTree } from './types';
import { useOrgUnitTypeNames } from './useOrgUnitTypeNames';

type UseOrgUnitTreeResult = {
    tree: OrgUnitTree | undefined;
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
// org units the tree actually cares about in memory - never the
// full pyramid down to facility level.
export const useOrgUnitTree = (
    interventionTypeId?: number,
): UseOrgUnitTreeResult => {
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
                ? buildOrgUnitTree(orgUnits, orgUnitTypeNames)
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
