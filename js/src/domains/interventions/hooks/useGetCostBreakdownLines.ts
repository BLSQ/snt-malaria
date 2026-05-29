import { getRequest } from 'bluesquare-components';
import { UseQueryResult } from 'react-query';
import { useSnackQuery } from 'Iaso/libs/apiHooks';
import { InterventionCostBreakdownLine } from '../types';

export const useGetCostBreakdownLines = (): UseQueryResult<
    InterventionCostBreakdownLine[]
> => {
    return useSnackQuery({
        queryKey: ['costBreakdownLines'],
        queryFn: () =>
            getRequest('/api/snt_malaria/intervention_cost_breakdown_lines/'),
        options: {
            cacheTime: Infinity, // disable auto fetch on cache expiration
        },
    });
};
