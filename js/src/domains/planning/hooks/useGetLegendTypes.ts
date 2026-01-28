import { DropdownOptions } from 'bluesquare-components';
import { UseQueryResult } from 'react-query';
import { getRequest } from 'Iaso/libs/Api';
import { useSnackQuery } from 'Iaso/libs/apiHooks';

export const useGetLegendTypes = (): UseQueryResult<
    DropdownOptions<string>[],
    Error
> => {
    return useSnackQuery({
        queryKey: ['metricTypesLegendTypes'],
        queryFn: () => getRequest('/api/metrictypes/legend_types/'),
        options: {
            cacheTime: Infinity, // disable auto fetch on cache expiration
        },
    });
};
