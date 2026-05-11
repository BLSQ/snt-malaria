import { UseQueryResult } from 'react-query';

import { getRequest } from 'Iaso/libs/Api';
import { useSnackQuery } from 'Iaso/libs/apiHooks';
import { DropdownOptions } from 'Iaso/types/utils';

type OrgUnitTypeDropdownItem = {
    id: number;
    name: string;
    depth?: number;
};

type DropdownResponse =
    | OrgUnitTypeDropdownItem[]
    | { results: OrgUnitTypeDropdownItem[] };

/** `value` / `label` for selects; `depth` drives default picks in Account settings. */
export type OrgUnitTypeOption = DropdownOptions<number> & {
    depth: number | undefined;
};

export const useGetOrgUnitTypes = (
    enabled: boolean,
): UseQueryResult<OrgUnitTypeOption[], Error> =>
    useSnackQuery({
        queryKey: ['snt_malaria_configureAccount_org_unit_types'],
        queryFn: () => getRequest('/api/v2/orgunittypes/dropdown/'),
        options: {
            enabled,
            select: (data: DropdownResponse) => {
                const items = Array.isArray(data)
                    ? data
                    : (data?.results ?? []);
                return items.map(
                    (t): OrgUnitTypeOption => ({
                        value: t.id,
                        label: t.name,
                        depth: t.depth,
                    }),
                );
            },
        },
    });
