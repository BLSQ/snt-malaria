import { getRequest } from 'Iaso/libs/Api';
import { useSnackQuery } from 'Iaso/libs/apiHooks';
import { UseQueryResult } from 'react-query';
import { CostUnitType } from '../types';

export const useGetCostUnitTypes = (): UseQueryResult<CostUnitType[], Error> =>
    useSnackQuery({
        queryKey: ['costUnitTypes'],
        queryFn: () => getRequest('/api/snt_malaria/cost_unit_types/'),
        options: {
            cacheTime: Infinity, // disable auto fetch on cache expiration
        },
    });
