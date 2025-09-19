import { UseQueryResult } from 'react-query';
import { getRequest } from 'Iaso/libs/Api';
import { useSnackQuery } from 'Iaso/libs/apiHooks';
import { CostBreakdownLineCategory } from '../types/CostBreakdownLine';

export const useGetCostBreakdownLineCategories = <
    T = CostBreakdownLineCategory[],
>(
    selectFn?: (data: CostBreakdownLineCategory[]) => T,
): UseQueryResult<T | CostBreakdownLineCategory[], Error> => {
    return useSnackQuery({
        queryKey: ['costBreakdownLineCategories'],
        queryFn: () =>
            getRequest('/api/snt_malaria/cost_breakdown_line_categories'),
        options: {
            staleTime: 1000 * 60 * 15, // in MS
            cacheTime: 1000 * 60 * 5,
            select: (data: CostBreakdownLineCategory[]) => {
                return selectFn ? selectFn(data) : data;
            },
        },
    });
};
