import { getRequest } from 'bluesquare-components';
import { UseQueryResult } from 'react-query';
import { useSnackQuery } from 'Iaso/libs/apiHooks';
import { InterventionCostBreakdownLine } from '../types';

export const COST_BREAKDOWN_LINES_QUERY_KEY = ['costBreakdownLines'];

export const useGetCostBreakdownLines = (): UseQueryResult<
    InterventionCostBreakdownLine[]
> => {
    return useSnackQuery({
        queryKey: COST_BREAKDOWN_LINES_QUERY_KEY,
        queryFn: () =>
            getRequest('/api/snt_malaria/intervention_cost_breakdown_lines/'),
        options: {
            cacheTime: Infinity, // disable auto fetch on cache expiration
        },
    });
};
